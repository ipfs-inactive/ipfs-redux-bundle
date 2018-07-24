/* global jest, it, expect */
const { composeBundlesRaw } = require('redux-bundler')
const getIpfs = require('window.ipfs-fallback')
const ipfsBundle = require('./index')

jest.mock('window.ipfs-fallback')

it('should initialise IPFS', (done) => {
  const testIdentity = { hello: 'world' }
  getIpfs.mockResolvedValue({
    id: jest.fn().mockResolvedValue(testIdentity)
  })
  const store = composeBundlesRaw(
    ipfsBundle
  )()

  expect(store.selectIpfsReady()).toBe(false)
  store.subscribeToSelectors(['selectIpfsReady'], () => {
    expect(store.selectIpfsReady()).toBe(true)
    expect(store.selectIpfsIdentity()).toBe(testIdentity)
    done()
  })
  store.doInitIpfs()
})
