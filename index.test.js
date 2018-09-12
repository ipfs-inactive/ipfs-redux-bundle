/* global jest, it, expect */
const { composeBundlesRaw } = require('redux-bundler')
const ipfsBundle = require('./index')

it('Should fail when connecting to window.ipfs', (done) => {
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

it('Should success when connecting to window.ipfs', (done) => {
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
    done()
  })
  store.doInitIpfs()
})

it('should connect directly when running inside of ipfs-companion', (done) => {
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
    done()
  })
  store.doInitIpfs()
})
