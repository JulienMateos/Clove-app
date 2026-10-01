import SwiftUI

@main
struct CloveApp: App {
    var body: some Scene {
        WindowGroup {
            CloveWebView()
                .ignoresSafeArea()
                .background(Color(red: 0.957, green: 0.941, blue: 0.910)) // #F4F0E8, fond de l'app
        }
    }
}
