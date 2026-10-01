import SwiftUI
import WebKit

enum CloveConfig {
    /// Adresse de l'app sur Firebase Hosting (`npm run deploy`), ex. https://clove-app.web.app/
    static let appURL = URL(string: "https://TON-PROJET.web.app/")!
}

/// Affiche l'app web Clove (web/) en plein écran. Le front n'est pas réécrit :
/// toute l'app — et le branchement Firebase — vit dans web/.
struct CloveWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.websiteDataStore = .default() // garde la session Firebase entre deux lancements

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true } // Safari → Développement → ton iPhone
        #endif
        web.load(URLRequest(url: CloveConfig.appURL))
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private var usedFallback = false

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
