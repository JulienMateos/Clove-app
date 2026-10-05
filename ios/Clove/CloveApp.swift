import SwiftUI

@main
struct CloveApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            CloveWebView()
                .ignoresSafeArea()
                .background(Color(red: 0.973, green: 0.961, blue: 0.933)) // #F8F5EE, comme l’écran de démarrage
        }
    }
}
