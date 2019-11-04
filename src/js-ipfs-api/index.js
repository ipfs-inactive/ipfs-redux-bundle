/* eslint-env browser, webextensions */
const toMultiaddr = require('uri-to-multiaddr')
const { isURL } = require('../utils')
const provider = 'js-ipfs-api'

// 1. Try user specified API address
// 2. Try current origin
// 3. Try default origin
async function tryApi ({ ipfsClient, apiAddress, defaultApiAddress, location, ipfsConnectionTest }) {
  console.info('🎛️ Customise your js-ipfs-api options by storing a `ipfsApi` object in localStorage. e.g. localStorage.setItem(\'ipfsApi\', \'/ip4/127.0.0.1/tcp/5001\')')
  // Explicit custom apiAddress provided. Only try that.
  if (apiAddress) {
    console.log('Trying ipfs-api with custom api address', apiAddress)
    return maybeApi({ apiAddress, ipfsConnectionTest, ipfsClient })
  }

  // Current origin is not localhost:5001 so try with current origin info
  if (location.port !== '5001' || !location.hostname.match(/^127.0.0.1$|^localhost$/)) {
    let originAddress = null
    try {
      originAddress = toMultiaddr(location.origin).toString()
    } catch (err) {
      console.log(`Failed to convert ${location.origin} to a multiaddr`)
    }
    if (originAddress) {
      console.log('Trying ipfs-api at current origin', originAddress)
      const res = await maybeApi({
        apiAddress: originAddress,
        apiOpts: {
          protocol: location.protocol.slice(0, -1)
        },
        ipfsConnectionTest,
        ipfsClient
      })
      if (res) return res
    }
  }

  // ...otherwise try /ip4/127.0.0.1/tcp/5001
  console.log('Trying ipfs-api', defaultApiAddress)
  return maybeApi({ apiAddress: defaultApiAddress, ipfsConnectionTest, ipfsClient })
}

// Helper to construct and test an api client. Returns an js-ipfs-api instance or null
async function maybeApi ({ apiAddress, apiOpts, ipfsConnectionTest, ipfsClient }) {
  const address = isURL(apiAddress) ? parseURL(apiAddress) : apiAddress
  try {
    const ipfs = ipfsClient(address, apiOpts)
    await ipfsConnectionTest(ipfs)
    return { ipfs, provider, apiAddress }
  } catch (error) {
    console.log('Failed to connect to ipfs-api', apiAddress)
  }
}

function parseURL (addr) {
  const url = new URL(addr)

  const opts = {
    host: url.hostname,
    port: url.port,
    protocol: url.protocol.slice(0, -1),
    headers: {}
  }

  if (url.username) {
    opts.headers.authorization = `Basic ${btoa(unescape(encodeURIComponent(url.username + ':' + url.password)))}`
  }

  return opts
}

module.exports = tryApi
