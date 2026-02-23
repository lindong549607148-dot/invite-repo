function track(event, data) {
  console.log('[track]', event, data || {})
  // TODO: send to /api/track in future
}

module.exports = { track }
