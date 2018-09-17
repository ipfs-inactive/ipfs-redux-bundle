/* global jest, it, describe, afterEach, beforeAll, afterAll, expect */
const { composeBundlesRaw } = require('redux-bundler')
const ipfsBundle = require('./index')
const IPFSFactory = require('ipfsd-ctl')

const f = IPFSFactory.create()
const longTimeout = 50 * 1000

describe('window.ipfs', () => {
  afterEach(() => {
    global.ipfs = undefined
    global.browser = undefined
  })

  it('Should fail to connect via window.ipfs when missing', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle({ tryApi: false, tryJsIpfs: false })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsInitFailed'], () => {
      expect(store.selectIpfsInitFailed()).toBe(true)
      done()
    })

    store.doInitIpfs()
  })

  it('Should connect via window.ipfs', (done) => {
    const testIdentity = { hello: 'window.ipfs' }

    global.ipfs = {
      id: jest.fn().mockResolvedValue(testIdentity)
    }

    const store = composeBundlesRaw(
      ipfsBundle({ tryApi: false, tryJsIpfs: false })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity()).toBe(testIdentity)
      expect(store.selectIpfsProvider()).toBe('window.ipfs')
      delete global.ipfs
      done()
    })
    store.doInitIpfs()
  })

  it('Should connect directly when running inside of ipfs-companion', (done) => {
    const testIdentity = { hello: 'window.ipfs' }
    global.ipfs = {
      id: jest.fn().mockResolvedValue(testIdentity)
    }

    // browser.runtime.getBackgroundPage().ipfsCompanion.ipfs will be present
    // only if page was loaded from a path that belongs to our browser extension
    const testWebExtIdentity = { hello: 'ipfsCompanion.ipfs' }
    global.browser = {
      get runtime () {
        return {
          getBackgroundPage: async function () {
            return {
              get ipfsCompanion () {
                return {
                  get ipfs () {
                    return {
                      id: async function () {
                        return testWebExtIdentity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const store = composeBundlesRaw(
      ipfsBundle({ tryApi: false, tryJsIpfs: false })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity()).toBe(testWebExtIdentity)
      expect(store.selectIpfsProvider()).toBe('window.ipfs')
      delete global.ipfs
      global.browser = {
        get runtime () {
          return {
            getBackgroundPage: async function () {
              return {
              }
            }
          }
        }
      }
      done()
    })
    store.doInitIpfs()
  })
})

describe('js-ipfs-api', () => {
  let ipfsd
  let apiAddr
  let id

  beforeAll((done) => {
    f.spawn({ initOptions: { bits: 1024 } }, async (err, _ipfsd) => {
      expect(err).toBe(null)
      ipfsd = _ipfsd
      apiAddr = ipfsd.apiAddr.toString()
      id = await ipfsd.api.id()
      done()
    })
  }, longTimeout)

  afterAll((done) => {
    if (!ipfsd) return done()
    ipfsd.stop(done)
  }, longTimeout)

  afterEach(() => {
    global.ipfs = undefined
    global.browser = undefined
  })

  it('Should connect via js-ipfs-api when window.ipfs is not present', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle({ defaultApiOpts: apiAddr })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity()).toEqual(id)
      expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
      done()
    })

    store.doInitIpfs()
  })

  it('Should connect via js-ipfs-api when window.ipfs present but disabled by options', (done) => {
    const testIdentity = { hello: 'window.ipfs' }

    global.ipfs = {
      id: jest.fn().mockResolvedValue(testIdentity)
    }

    const store = composeBundlesRaw(
      ipfsBundle({ tryWindow: false, defaultApiOpts: apiAddr })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity()).toEqual(id)
      expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
      done()
    })

    store.doInitIpfs()
  })

  it('Should connect via js-ipfs-api when window.ipfs present but fails', (done) => {
    global.ipfs = {
      id: async () => {
        throw new Error('STOP')
      }
    }

    const store = composeBundlesRaw(
      ipfsBundle({ defaultApiOpts: apiAddr })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity()).toEqual(id)
      expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
      done()
    })

    store.doInitIpfs()
  })
})

describe('js-ipfs', () => {
  global.ipfs = undefined
  global.browser = undefined

  it('Should connect via js-ipfs', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle({
        tryJsIpfs: true,
        getIpfs: () => require('ipfs')
      })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    let first = true

    store.subscribeToSelectors(['selectIpfsReady'], () => {
      if (first) {
        expect(store.selectIpfsReady()).toBe(true)
        expect(store.selectIpfsProvider()).toBe('js-ipfs')
        store.doStopIpfs()
        first = false
      } else {
        expect(store.selectIpfsReady()).toBe(false)
        done()
      }
    })

    store.doInitIpfs()
  }, longTimeout)

  it('Should connect via js-ipfs instead of window.ipfs or js-ipfs-api', (done) => {
    const testIdentity = { hello: 'window.ipfs' }

    global.ipfs = {
      id: jest.fn().mockResolvedValue(testIdentity)
    }

    const store = composeBundlesRaw(
      ipfsBundle({
        tryWindow: false,
        tryApi: false,
        tryJsIpfs: true,
        getIpfs: () => require('ipfs')
      })
    )()

    let first = true
    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      if (first) {
        expect(store.selectIpfsReady()).toBe(true)
        expect(store.selectIpfsIdentity()).not.toEqual(testIdentity)
        expect(store.selectIpfsProvider()).toBe('js-ipfs')
        store.doStopIpfs()
        first = false
      } else {
        expect(store.selectIpfsReady()).toBe(false)
        done()
      }
    })

    store.doInitIpfs()
  }, longTimeout)
})
