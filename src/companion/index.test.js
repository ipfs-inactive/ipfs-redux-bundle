/* global it, expect */
const tryCompanion = require('./index.js')

it('Should connect to IPFS companion', async (done) => {
  // chrome.extension.getBackgroundPage().ipfsCompanion.ipfs will be present
  // only if page was loaded from a path that belongs to our browser extension

  const mockIpfs = {}

  const root = {
    chrome: {
      extension: {
        getBackgroundPage () {
          return {
            ipfsCompanion: {
              ipfs: mockIpfs
            }
          }
        }
      }
    }
  }

  const ipfsConnectionTest = (ipfs) => {
    expect(ipfs).toEqual(mockIpfs)
    Promise.resolve()
  }
  const res = await tryCompanion({ root, ipfsConnectionTest })
  expect(res.ipfs).toEqual(mockIpfs)
  expect(res.provider).toEqual('ipfs-companion')
  done()
})
