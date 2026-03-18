import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"
import appBackgroundUrl from "./assets/background.png"
import "./style.css"
import "katex/dist/katex.min.css"

if (typeof document !== "undefined") {
	document.documentElement.style.setProperty(
		"--app-background-image",
		`url("${appBackgroundUrl}")`
	)
}

createApp(App).use(router).mount("#app")