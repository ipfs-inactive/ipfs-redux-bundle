const provider = 'ipfs-desktop'

async function tryDesktop ({ root, ipfsConnectionTest }) {
  console.log('Trying IPFS Desktop')
  if (root.ipfsDesktopApi) {
    try {
      await ipfsConnectionTest(root.ipfsDesktopApi)
      console.log('Found IPFS Desktop. Nice!')
      return { ipfs: root.ipfsDesktopApi, provider }
    } catch (error) {
      console.log('Failed to connect via IPFS Desktop', error)
    }
  } else {
    console.log('IPFS Desktop not found.')
  }
}

module.exports = tryDesktop
