import app from "./app.js";
import config from "./config/index.js";

const PORT = config.port;

app.listen(PORT, () => {
	console.log(`🚀 Insighta Labs+ API running on port ${PORT}`);
	console.log(`📝 Environment: ${config.nodeEnv}`);
	console.log(`🔗 API Base URL: ${config.apiBaseUrl}`);
	if (config.nodeEnv !== 'production') {
		console.log(`💻 Web Portal URL: ${config.webPortalUrl}`);
	}
});
