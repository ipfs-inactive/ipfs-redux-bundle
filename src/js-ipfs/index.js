const provider = 'js-ipfs'

function promiseMeJsIpfs (Ipfs, opts) {
  return new Promise((resolve, reject) => {
    const ipfs = new Ipfs(opts)
    ipfs.once('ready', () => resolve(ipfs))
    ipfs.once('error', err => reject(err))
  })
}

async function tryJsIpfs ({ ipfsConnectionTest, getJsIpfs, jsIpfsOpts, initJsIpfs = promiseMeJsIpfs }) {
  try {
    console.log('Fetching js-ipfs')
    const Ipfs = await getJsIpfs()
    console.info('🎛️ Customise your js-ipfs opts by setting an `ipfsOpts` value in localStorage. e.g. localStorage.setItem(\'ipfsOpts\', JSON.stringify({relay: {enabled: true}}))')
    console.log('Trying js-ipfs', jsIpfsOpts)
    const ipfs = await initJsIpfs(Ipfs, jsIpfsOpts)
    await ipfsConnectionTest(ipfs)
    console.timeEnd('js-ipfs ready!')
    return { ipfs, provider }
  } catch (error) {
    console.log('Failed to initialise js-ipfs', error)
  }
}

module.exports = tryJsIpfs
