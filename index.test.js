/* global jest, it, describe, beforeEach, afterEach, expect */
const { composeBundlesRaw } = require('redux-bundler')
const ipfsBundle = require('./index')
const nock = require('nock')

const longTimeout = 50 * 1000

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
    store.dispatch({ type: 'IPFS_INIT_FINISHED' })
    expect(store.selectIpfsInitFailed()).toBe(false)
    expect(store.selectIpfsReady()).toBe(true)
  })
})

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
  const idResponse = { 'ID': 'QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8', 'PublicKey': 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCq2cwYuiR/ZfSWaIXdFhrXz5c+c7W3SmQ5N2wWl4du05YUV63qYlGLNqVP0vyM6IJYPHAqsNT3yT8h9kMr/aSExLctRoYk9K6wf6xpNTltJdNdFunOWjba44s2du/jeYClJsNV3egnUddJV/jpjLPRYbELdbA40rucQ7jYu9QwNKlJ5EHE6m4nLPYLyq0mCPSpm9XOKhuKio3gRQfyo4r9nobZ3gSy/t9/n4tQmNh6GNlgi6O1pKvN1jZ6Pf0dLUlwhHjblftzyYbzyIfHlzt7OU7O8P7BHhNavUn1HOhP3l6OIN5eEtlb30wT6ZT6PsWKqrwMotLD7gBhmiLfny9rAgMBAAE=', 'Addresses': ['/ip4/127.0.0.1/tcp/4002/ipfs/QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8', '/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8', '/ip4/192.168.1.106/tcp/4002/ipfs/QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8'], 'AgentVersion': 'js-ipfs/0.32.0', 'ProtocolVersion': '9000' }

  beforeEach(() => {
    nock('http://127.0.0.1:5001')
      .post('/api/v0/id?stream-channels=true')
      .reply(200, idResponse, {
        'Content-Type': 'application/json'
      })
  })

  afterEach(() => {
    nock.cleanAll()
    global.ipfs = undefined
    global.browser = undefined
  })

  it('Should connect via js-ipfs-api when window.ipfs is not present', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity().id).toEqual(idResponse.ID)
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
      ipfsBundle({ tryWindow: false })
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity().id).toEqual(idResponse.ID)
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
      ipfsBundle()
    )()

    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsIdentity().id).toEqual(idResponse.ID)
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
        getJsIpfs: () => require('ipfs')
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
        getJsIpfs: () => require('ipfs')
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

describe('miscellaneous', () => {
  const idPort5001 = { 'ID': 'Port5001', 'PublicKey': 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCq2cwYuiR/ZfSWaIXdFhrXz5c+c7W3SmQ5N2wWl4du05YUV63qYlGLNqVP0vyM6IJYPHAqsNT3yT8h9kMr/aSExLctRoYk9K6wf6xpNTltJdNdFunOWjba44s2du/jeYClJsNV3egnUddJV/jpjLPRYbELdbA40rucQ7jYu9QwNKlJ5EHE6m4nLPYLyq0mCPSpm9XOKhuKio3gRQfyo4r9nobZ3gSy/t9/n4tQmNh6GNlgi6O1pKvN1jZ6Pf0dLUlwhHjblftzyYbzyIfHlzt7OU7O8P7BHhNavUn1HOhP3l6OIN5eEtlb30wT6ZT6PsWKqrwMotLD7gBhmiLfny9rAgMBAAE=', 'Addresses': ['/ip4/127.0.0.1/tcp/4002/ipfs/Port5001', '/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8', '/ip4/192.168.1.106/tcp/4002/ipfs/QmNTAZYQ5rtaoFtryAX2h9dycuBjhVgXtjPVZNYuMHMBw8'], 'AgentVersion': 'js-ipfs/0.32.0', 'ProtocolVersion': '9000' }
  const idPort5002 = { 'ID': 'Port5002' }

  beforeEach(() => {
    global.ipfs = undefined
    global.browser = undefined

    nock('http://127.0.0.1:5001')
      .post('/api/v0/id?stream-channels=true')
      .reply(200, idPort5001, {
        'Content-Type': 'application/json'
      })

    nock('http://127.0.0.1:5002')
      .post('/api/v0/id?stream-channels=true')
      .reply(200, idPort5002, {
        'Content-Type': 'application/json'
      })
  })

  afterEach(nock.cleanAll)

  it('Should connect to port 5001 and then update to 5002', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()

    expect(store.selectIpfsInvalidAddress()).toBe(false)
    expect(store.selectIpfsReady()).toBe(false)
    let it = 0

    store.subscribeToSelectors(['selectIpfsReady'], () => {
      if (it === 0) {
        it++
        expect(store.selectIpfsReady()).toBe(true)
        expect(store.selectIpfsInvalidAddress()).toBe(false)
        expect(store.selectIpfsIdentity().id).toEqual(idPort5001.ID)
        expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
        store.doUpdateIpfsApiAddress('/ip4/127.0.0.1/tcp/5002')
      } else if (it === 1) {
        it++
        expect(store.selectIpfsReady()).toBe(false)
        expect(store.selectIpfsInvalidAddress()).toBe(false)
      } else {
        expect(store.selectIpfsReady()).toBe(true)
        expect(store.selectIpfsInvalidAddress()).toBe(false)
        expect(store.selectIpfsIdentity().id).toEqual(idPort5002.ID)
        expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
        done()
      }
    })

    store.doInitIpfs()
  })

  it('Should connect to port 5001 via doUpdateIpfsApiAddress', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()

    expect(store.selectIpfsInvalidAddress()).toBe(false)
    expect(store.selectIpfsReady()).toBe(false)
    store.subscribeToSelectors(['selectIpfsReady'], () => {
      expect(store.selectIpfsReady()).toBe(true)
      expect(store.selectIpfsInvalidAddress()).toBe(false)
      expect(store.selectIpfsIdentity().id).toEqual(idPort5001.ID)
      expect(store.selectIpfsProvider()).toBe('js-ipfs-api')
      done()
    })

    store.doUpdateIpfsApiAddress('/ip4/127.0.0.1/tcp/5001')
  })

  it('Should get invalid address via doUpdateIpfsApiAddress', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()

    expect(store.selectIpfsReady()).toBe(false)
    expect(store.selectIpfsInvalidAddress()).toBe(false)
    store.subscribeToSelectors(['selectIpfsInvalidAddress'], () => {
      expect(store.selectIpfsReady()).toBe(false)
      expect(store.selectIpfsInvalidAddress()).toBe(true)
      done()
    })

    store.doUpdateIpfsApiAddress('OBVIOUSLY INVALID ADDRESS')
  })

  it('Should get invalid address via doUpdateIpfsApiAddress and then dismiss it', (done) => {
    const store = composeBundlesRaw(
      ipfsBundle()
    )()

    expect(store.selectIpfsReady()).toBe(false)
    expect(store.selectIpfsInvalidAddress()).toBe(false)
    let first = true
    store.subscribeToSelectors(['selectIpfsInvalidAddress'], () => {
      if (first) {
        expect(store.selectIpfsReady()).toBe(false)
        expect(store.selectIpfsInvalidAddress()).toBe(true)
        first = false
        store.doDismissIpfsInvalidAddress()
      } else {
        expect(store.selectIpfsReady()).toBe(false)
        expect(store.selectIpfsInvalidAddress()).toBe(false)
        done()
      }
    })

    store.doUpdateIpfsApiAddress('OBVIOUSLY INVALID ADDRESS')
  })
})
