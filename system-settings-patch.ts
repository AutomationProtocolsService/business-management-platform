// Add this code to the system settings PATCH endpoint in server/routes.ts line 2634
// Right after updating the settings but before sending the response:

// Send real-time update to all connected clients
const wsManager = getWebSocketManager();
if (wsManager && updatedSettings) {
  wsManager.broadcast("settings:updated", {
    data: updatedSettings,
    message: "System settings updated",
    timestamp: new Date().toISOString()
  });
}