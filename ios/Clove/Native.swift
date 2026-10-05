import UIKit
import WebKit
import CoreLocation
import UserNotifications
import Security

/// Ce que l'app web (web/) ne peut pas faire seule et que l'app iOS ajoute :
/// - garder le compte Apple en mémoire même après suppression de l'app (trousseau iCloud/Keychain) ;
/// - les notifications push (jeton APNs transmis au serveur) ;
/// - la position en arrière-plan quand le radar est allumé, écran verrouillé ou app fermée.

// MARK: - Pont vers la page web

final class NativeBridge {
    static let shared = NativeBridge()
    weak var webView: WKWebView?

    func send(_ type: String, _ data: [String: Any]) {
        DispatchQueue.main.async {
            guard let json = try? JSONSerialization.data(withJSONObject: data),
                  let payload = String(data: json, encoding: .utf8) else { return }
            self.webView?.evaluateJavaScript("window.__cloveNative && window.__cloveNative('\(type)', \(payload));")
        }
    }
}

// MARK: - Trousseau : survit à la suppression de l'app

enum Keychain {
    private static let service = "com.clove.mvp"

    static func get(_ key: String) -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: key, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    static func set(_ key: String, _ value: String?) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: key]
        SecItemDelete(q as CFDictionary)
        guard let value else { return }
        var add = q
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }
}

// MARK: - Notifications push

final class Push: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Push()

    /// Demandée par la page web une fois le profil créé.
    func register() {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func didRegister(_ token: Data) {
        #if DEBUG
        let env = "sandbox"     // app lancée depuis Xcode
        #else
        let env = "production"  // TestFlight et App Store
        #endif
        NativeBridge.shared.send("pushToken", ["token": token.map { String(format: "%02x", $0) }.joined(), "env": env])
    }

    // App ouverte : l'écran change déjà tout seul, pas besoin de bannière.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler done: @escaping (UNNotificationPresentationOptions) -> Void) {
        done([])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler done: @escaping () -> Void) {
        UIApplication.shared.applicationIconBadgeNumber = 0
        done()
    }
}

// MARK: - Position en arrière-plan (radar allumé)

final class BackgroundLocation: NSObject, CLLocationManagerDelegate {
    static let shared = BackgroundLocation()
    private let manager = CLLocationManager()
    private var last: CLLocation?
    private var lastSent = Date.distantPast
    private var timer: Timer?
    private let defaults = UserDefaults.standard

    // Réglages envoyés par la page web : radar allumé, clé d'appareil, adresse du serveur.
    private var on: Bool { get { defaults.bool(forKey: "radar.on") } set { defaults.set(newValue, forKey: "radar.on") } }
    private var key: String? { get { defaults.string(forKey: "radar.key") } set { defaults.set(newValue, forKey: "radar.key") } }
    private var endpoint: String? { get { defaults.string(forKey: "radar.url") } set { defaults.set(newValue, forKey: "radar.url") } }

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        manager.distanceFilter = kCLDistanceFilterNone
        manager.pausesLocationUpdatesAutomatically = false
        manager.activityType = .other
    }

    /// Au lancement (y compris quand iOS relance l'app en arrière-plan pour un déplacement).
    func resume() { if on, let key, !key.isEmpty { start() } }

    /// La page web allume / éteint le radar.
    func setRadar(on: Bool, key: String?, url: String?) {
        if let key { self.key = key }
        if let url { endpoint = url }
        self.on = on
        on ? start() : stop()
    }

    private func start() {
        if manager.authorizationStatus == .notDetermined || manager.authorizationStatus == .authorizedWhenInUse {
            manager.requestAlwaysAuthorization() // « Toujours » : pour être trouvé écran verrouillé
        }
        manager.allowsBackgroundLocationUpdates = true
        manager.showsBackgroundLocationIndicator = true
        manager.startUpdatingLocation()
        manager.startMonitoringSignificantLocationChanges() // relance l'app si elle a été fermée
        timer?.invalidate()
        // Immobile, iOS envoie peu de positions : on redit au serveur qu'on est là toutes les 30 s.
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in self?.sendLast(force: true) }
    }

    private func stop() {
        timer?.invalidate(); timer = nil
        manager.stopUpdatingLocation()
        manager.stopMonitoringSignificantLocationChanges()
        manager.allowsBackgroundLocationUpdates = false
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if on, manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse { start() }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        last = loc
        sendLast(force: false)
    }

    private func sendLast(force: Bool) {
        guard on, let loc = last, let key, let endpoint, let url = URL(string: endpoint) else { return }
        // Au plus une position toutes les 20 s (le serveur considère quelqu'un absent après 60 s sans nouvelles).
        if !force && Date().timeIntervalSince(lastSent) < 20 { return }
        lastSent = Date()
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["key": key, "lat": loc.coordinate.latitude, "lng": loc.coordinate.longitude])
        let task = UIApplication.shared.beginBackgroundTask(withName: "clove.position")
        URLSession.shared.dataTask(with: req) { [weak self] data, res, _ in
            defer { UIApplication.shared.endBackgroundTask(task) }
            let status = (res as? HTTPURLResponse)?.statusCode ?? 0
            let mode = (data.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any])?["mode"] as? String
            // Compte supprimé, ou radar éteint côté serveur (fin de rencontre) : on arrête d'envoyer.
            if status == 404 || mode == "ghost" {
                DispatchQueue.main.async {
                    if status == 404 { self?.key = nil }
                    self?.setRadar(on: false, key: nil, url: nil)
                }
            }
        }.resume()
    }
}

// MARK: - Délégué de l'app

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = Push.shared
        BackgroundLocation.shared.resume()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken token: Data) {
        Push.shared.didRegister(token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Clove] notifications:", error.localizedDescription)
    }
}
