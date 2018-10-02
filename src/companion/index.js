const provider = 'ipfs-companion'

async function tryCompanion ({ root, ipfsConnectionTest }) {
  console.log('Trying IPFS Companion')

  // Opportunistic optimizations when running from ipfs-companion (+ ipfs-desktop in future)
  if (typeof root.chrome === 'object') {
    // Note: under some vendors getBackgroundPage() will return null if window is in incognito mode
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1329304
    const webExt = root.chrome.extension.getBackgroundPage()
    // If extension is ipfs-companion exposing IPFS API, use it directly for best performance
    if (webExt && webExt.ipfsCompanion && webExt.ipfsCompanion.ipfs) {
      const ipfs = webExt.ipfsCompanion.ipfs
      try {
        await ipfsConnectionTest(ipfs)
        return { ipfs, provider }
      } catch (error) {
        console.log('IPFS Companion detected but connection failed. Ignoring.', error)
      }
    }
  }
}

module.exports = tryCompanion
