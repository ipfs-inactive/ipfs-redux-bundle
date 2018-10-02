/* global jest, it, describe, expect */
const { composeBundlesRaw } = require('redux-bundler')
const ipfsBundle = require('./index')

jest.mock('./companion')
jest.mock('./window.ipfs')
jest.mock('./js-ipfs-api')
jest.mock('./js-ipfs')

const tryCompanion = require('./companion')
const tryWindow = require('./window.ipfs')
const tryApi = require('./js-ipfs-api')
const tryJsIpfs = require('./js-ipfs')

describe('IPFS init', () => {
  it('should try nothing and fail if all providers are disabled', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle({
        tryCompanion: false,
        tryWindow: false,
        tryApi: false,
        tryJsIpfs: false
      })
    )()
    store.subscribeToSelectors(['selectIpfsInitFailed'], () => {
      expect(store.selectIpfsInitFailed()).toBe(true)
      expect(store.selectIpfsReady()).toBe(false)
      done()
    })
    store.doInitIpfs()
  })

  it('should try ipfs-companion first', (done) => {
    const mockResult = { ipfs: {}, provider: 'ipfs-companion' }
    tryCompanion.mockResolvedValue(mockResult)
    tryWindow.mockResolvedValue({ ipfs: {}, provider: 'nope' })
    const bundle = ipfsBundle()
    const store = composeBundlesRaw(bundle)()
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsInitFailed()).toBe(false)
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsProvider()).toBe(mockResult.provider)
      done()
    })
    store.doInitIpfs()
  })

  it('should try window.ipfs after companion', (done) => {
    const mockResult = { ipfs: {}, provider: 'window.ipfs' }
    tryCompanion.mockResolvedValue(null)
    tryWindow.mockResolvedValue(mockResult)
    const bundle = ipfsBundle()
    const store = composeBundlesRaw(bundle)()
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsInitFailed()).toBe(false)
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsProvider()).toBe(mockResult.provider)
      done()
    })
    store.doInitIpfs()
  })

  it('should try js-ipfs-api after window.ipfs', (done) => {
    const mockResult = { ipfs: {}, provider: 'js-ipfs-api' }
    tryCompanion.mockResolvedValue(null)
    tryWindow.mockResolvedValue(null)
    tryApi.mockResolvedValue(mockResult)
    const bundle = ipfsBundle()
    const store = composeBundlesRaw(bundle)()
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsInitFailed()).toBe(false)
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsProvider()).toBe(mockResult.provider)
      done()
    })
    store.doInitIpfs()
  })

  it('should try js-ipfs if enabled', (done) => {
    const mockResult = { ipfs: {}, provider: 'js-ipfs' }
    tryCompanion.mockResolvedValue(null)
    tryWindow.mockResolvedValue(null)
    tryApi.mockResolvedValue(null)
    tryJsIpfs.mockResolvedValue(mockResult)
    const bundle = ipfsBundle({
      tryJsIpfs: true,
      getJsIpfs: jest.fn()
    })
    const store = composeBundlesRaw(bundle)()
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsInitFailed()).toBe(false)
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsProvider()).toBe(mockResult.provider)
      expect(bundle.getExtraArgs().getIpfs()).toBe(mockResult.ipfs)
      done()
    })
    store.doInitIpfs()
  })
})
