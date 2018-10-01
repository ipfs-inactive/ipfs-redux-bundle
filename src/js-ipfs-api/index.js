import multiaddr from 'multiaddr'
const provider = 'js-ipfs-api'

// 1. Try user specified API address
// 2. Try current origin
// 3. Try default origin
export default async function tryApi ({ IpfsApi, apiAddress, defaultApiAddress, location, ipfsConnectionTest }) {
  console.info('🎛️ Customise your js-ipfs-api options by storing a `ipfsApi` object in localStorage. e.g. localStorage.setItem(\'ipfsApi\', \'/ip4/127.0.0.1/tcp/5001\')')
  // Explicit custom apiAddress provided. Only try that.
  if (apiAddress) {
    console.log('Trying ipfs-api with custom api address', apiAddress)
    return maybeApi({ apiOpts: apiAddress, ipfsConnectionTest, IpfsApi })
  }

  // Current origin is not localhost:5001 so try with current origin info
  if (location.port !== '5001' || !location.hostname.match(/^127.0.0.1$|^localhost$/)) {
    const defaultPort = location.protocol === 'https' ? '443' : '80'
    const opts = {
      protocol: location.protocol,
      host: location.hostname,
      port: location.port || defaultPort
    }
    console.log('Trying ipfs-api at current origin', opts)
    const res = await maybeApi({
      apiOpts: opts,
      ipfsConnectionTest,
      IpfsApi
    })
    if (res) return res
  }

  // ...otherwise try /ip4/127.0.0.1/tcp/5001
  console.log('Trying ipfs-api', defaultApiAddress)
  return maybeApi({ apiOpts: defaultApiAddress, ipfsConnectionTest, IpfsApi })
}

// Helper to construct and test an api client. Returns an js-ipfs-api instance or null
async function maybeApi ({ apiOpts, ipfsConnectionTest, IpfsApi }) {
  try {
    const ipfs = new IpfsApi(apiOpts)
    await ipfsConnectionTest(ipfs)
    return { ipfs, provider, apiOpts }
  } catch (error) {
    console.log('Failed to connect to ipfs-api', apiOpts)
  }
}
