const provider = 'window.ipfs'

async function tryWindowIpfs ({ root, ipfsConnectionTest }) {
  console.log('Trying window.ipfs')
  if (root.ipfs) {
    try {
      await ipfsConnectionTest(root.ipfs)
      console.log('Found `window.ipfs`. Nice!')
      return { ipfs: root.ipfs, provider }
    } catch (error) {
      console.log('Failed to connect via window.ipfs', error)
    }
  } else {
    console.log('window.ipfs not found. Consider Installing the IPFS Companion web extension - https://github.com/ipfs-shipyard/ipfs-companion')
  }
}

module.exports = tryWindowIpfs
