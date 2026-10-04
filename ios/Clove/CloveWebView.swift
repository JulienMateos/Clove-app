import SwiftUI
import WebKit
import AuthenticationServices
import CryptoKit

enum CloveConfig {
    /// Adresse de l'app sur Firebase Hosting (`npm run deploy`), ex. https://clove-app.web.app/
    static let appURL = URL(string: "https://clove-dating-app.web.app/")!
}

/// Affiche l'app web Clove (web/) en plein écran. Le front n'est pas réécrit :
/// toute l'app — et le branchement Firebase — vit dans web/. Cette vue ajoute seulement
/// ce que le web ne sait pas faire seul : la feuille native « Se connecter avec Apple ».
struct CloveWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.websiteDataStore = .default() // garde la session Firebase entre deux lancements
        config.applicationNameForUserAgent = "CloveiOS"

        // Dit à web/clove-api.js qu'il tourne dans l'app (mode plein écran + connexion Apple),
        // et lui ouvre un canal vers Swift : window.webkit.messageHandlers.clove.
        let native = WKUserScript(source: "window.CLOVE_NATIVE = { platform: 'ios', apple: true };",
                                  injectionTime: .atDocumentStart, forMainFrameOnly: true)
        config.userContentController.addUserScript(native)
        config.userContentController.add(WeakMessageHandler(context.coordinator), name: "clove")

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        // Pages fixes : pas de zoom au pincement ni de défilement de la page entière.
        web.scrollView.minimumZoomScale = 1
        web.scrollView.maximumZoomScale = 1
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        web.scrollView.isScrollEnabled = false
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true } // Safari → Développement → ton iPhone
        #endif
        context.coordinator.webView = web
        // Toujours la dernière version mise en ligne : on vide le cache des pages (pas la session Firebase,
        // qui est dans IndexedDB / localStorage), puis on charge sans cache.
        let caches: Set<String> = [WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache, WKWebsiteDataTypeFetchCache]
        WKWebsiteDataStore.default().removeData(ofTypes: caches, modifiedSince: .distantPast) {
            web.load(URLRequest(url: CloveConfig.appURL, cachePolicy: .reloadIgnoringLocalCacheData))
        }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler,
                             ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        weak var webView: WKWebView?
        private var usedFallback = false

        // MARK: Se connecter avec Apple

        // web/clove-api.js demande : { type: 'appleSignIn', nonce: '<aléatoire>' }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], body["type"] as? String == "appleSignIn",
                  let nonce = body["nonce"] as? String else { return }
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            // Apple reçoit le hash du nonce ; Firebase vérifie ensuite le nonce brut.
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            let auth = ASAuthorizationController(authorizationRequests: [request])
            auth.delegate = self
            auth.presentationContextProvider = self
            auth.performRequests()
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken, let idToken = String(data: tokenData, encoding: .utf8) else {
                return sendToWeb("appleError", ["code": "no-token", "message": "Jeton Apple manquant"])
            }
            sendToWeb("appleCredential", ["idToken": idToken, "user": credential.user])
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            let code = (error as? ASAuthorizationError)?.code == .canceled ? "canceled" : "failed"
            sendToWeb("appleError", ["code": code, "message": error.localizedDescription])
        }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            webView?.window ?? ASPresentationAnchor()
        }

        private func sendToWeb(_ type: String, _ data: [String: String]) {
            guard let json = try? JSONSerialization.data(withJSONObject: data),
                  let payload = String(data: json, encoding: .utf8) else { return }
            webView?.evaluateJavaScript("window.__cloveNative && window.__cloveNative('\(type)', \(payload));")
        }

        // MARK: Navigation

        // Pas de réseau au lancement : copie embarquée de web/ en mode démo (si le dossier est dans l'app).
        func webView(_ web: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard !usedFallback,
                  let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web"),
                  var parts = URLComponents(url: index, resolvingAgainstBaseURL: false) else { return }
            usedFallback = true
            parts.query = "offline=1"
            web.loadFileURL(parts.url!, allowingReadAccessTo: index.deletingLastPathComponent())
        }

        // Liens sortants (Google Maps, tel:, sms:, autres sites) → apps du système.
        func webView(_ web: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.allow) }
            let scheme = url.scheme?.lowercased() ?? ""
            let webSchemes = ["http", "https", "file", "about", "blob", "data"]
            let leavesApp = !webSchemes.contains(scheme) ||
                (action.targetFrame?.isMainFrame == true && !url.isFileURL && url.host != CloveConfig.appURL.host)
            if leavesApp {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        // window.open (bouton « Itinéraire » d'un match) → ouvre Maps / Safari.
        func webView(_ web: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url { UIApplication.shared.open(url) }
            return nil
        }
    }
}

/// WKUserContentController garde une référence forte vers son handler : ce relais évite une fuite.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
