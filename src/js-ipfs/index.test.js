/* global it, expect, jest */
const tryJsIpfs = require('./index.js')

it('Should connect to js-ipfs with default config', async (done) => {
  const mockIpfs = {}
  const opts = {
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true),
    getJsIpfs: jest.fn().mockResolvedValueOnce(true),
    jsIpfsOpts: {},
    initJsIpfs: jest.fn().mockResolvedValue(mockIpfs)
  }
  const res = await tryJsIpfs(opts)
  expect(res.ipfs).toEqual(mockIpfs)
  expect(res.provider).toEqual('js-ipfs')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.initJsIpfs.mock.calls.length).toBe(1)
  done()
})

it('Should connect to js-ipfs with custom config', async (done) => {
  const mockIpfs = {}
  const opts = {
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true),
    getJsIpfs: () => ({
      JsIpfs: jest.fn().mockResolvedValueOnce(true),
      JsIpfsConfig: {
        config: {
          Addresses: {
            Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star']
          }
        }
      }
    }),
    jsIpfsOpts: {},
    initJsIpfs: jest.fn().mockResolvedValue(mockIpfs)
  }
  const res = await tryJsIpfs(opts)
  expect(res.ipfs).toEqual(mockIpfs)
  expect(res.provider).toEqual('js-ipfs')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.initJsIpfs.mock.calls.length).toBe(1)
  done()
})
