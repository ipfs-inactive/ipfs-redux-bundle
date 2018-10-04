/* global it, describe, expect */
const { composeBundlesRaw } = require('redux-bundler')
const ipfsBundle = require('./index')

describe('reducer', () => {
  it('should preserve failed state during a restart', () => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()
    store.dispatch({ type: 'IPFS_INIT_STARTED' })
    expect(store.selectIpfsInitFailed()).toBe(false)
    expect(store.selectIpfsReady()).toBe(false)
    store.dispatch({ type: 'IPFS_INIT_FAILED' })
    expect(store.selectIpfsInitFailed()).toBe(true)
    expect(store.selectIpfsReady()).toBe(false)
    store.dispatch({ type: 'IPFS_INIT_STARTED' })
    expect(store.selectIpfsInitFailed()).toBe(true)
    expect(store.selectIpfsReady()).toBe(false)
    store.dispatch({
      type: 'IPFS_INIT_FINISHED',
      payload: {
        ipfs: {},
        provider: 'js-ipfs-api'
      }
    })
    expect(store.selectIpfsInitFailed()).toBe(false)
    expect(store.selectIpfsReady()).toBe(true)
  })

  it('should store a ref to ipfs and provide it via getExtraArgs', () => {
    const payload = {
      ipfs: {},
      provider: 'js-ipfs-api',
      apiAddress: '/dnsaddr/boom.cat/tcp/5001'
    }
    const bundle = ipfsBundle()
    const store = composeBundlesRaw(bundle)()
    expect(store.selectIpfsReady()).toBe(false)
    store.dispatch({ type: 'IPFS_INIT_STARTED' })
    expect(store.selectIpfsReady()).toBe(false)
    store.dispatch({
      type: 'IPFS_INIT_FINISHED',
      payload
    })
    expect(store.selectIpfsInitFailed()).toBe(false)
    expect(store.selectIpfsReady()).toBe(true)
    expect(store.selectIpfsApiAddress()).toBe(payload.apiAddress)
    expect(bundle.getExtraArgs().getIpfs()).toBe(payload.ipfs)
  })
})
