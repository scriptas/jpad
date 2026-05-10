package com.jpad.neon_app

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    
    // Set initial status bar to light icons (for dark theme)
    setStatusBarAppearance(true)
    
    // Add JavaScript interface for status bar control
    // Use post to ensure webview is fully initialized
    window.decorView.post {
      try {
        val webView = findWebView(window.decorView as ViewGroup)
        webView?.addJavascriptInterface(StatusBarInterface(this), "AndroidStatusBar")
      } catch (e: Exception) {
        android.util.Log.e("MainActivity", "Failed to add JS interface", e)
      }
    }
  }
  
  // Recursively find WebView in view hierarchy
  private fun findWebView(viewGroup: ViewGroup): WebView? {
    for (i in 0 until viewGroup.childCount) {
      val child = viewGroup.getChildAt(i)
      if (child is WebView) {
        return child
      } else if (child is ViewGroup) {
        val webView = findWebView(child)
        if (webView != null) return webView
      }
    }
    return null
  }
  
  // JavaScript interface class
  class StatusBarInterface(private val activity: MainActivity) {
    @JavascriptInterface
    fun setStyle(dark: Boolean) {
      activity.runOnUiThread {
        activity.setStatusBarAppearance(dark)
      }
    }
  }
  
  // Method to set status bar appearance
  // dark = true means use light icons (for dark backgrounds)
  // dark = false means use dark icons (for light backgrounds)
  fun setStatusBarAppearance(dark: Boolean) {
    val window = this.window
    val decorView = window.decorView
    
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
      // Android 11+ (API 30+)
      val controller = decorView.windowInsetsController
      if (controller != null) {
        if (dark) {
          // Dark background - use light icons
          controller.setSystemBarsAppearance(
            0,
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
          )
        } else {
          // Light background - use dark icons
          controller.setSystemBarsAppearance(
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
          )
        }
      }
    } else {
      // Android 6-10 (API 23-29)
      @Suppress("DEPRECATION")
      if (dark) {
        // Dark background - use light icons (remove light status bar flag)
        decorView.systemUiVisibility = decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
      } else {
        // Light background - use dark icons (add light status bar flag)
        decorView.systemUiVisibility = decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
      }
    }
  }
}
