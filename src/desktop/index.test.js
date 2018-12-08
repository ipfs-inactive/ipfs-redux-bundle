/* global it, expect, jest */
const tryDesktop = require('./index.js')

it('Should connect to IPFS Desktop', async (done) => {
  const opts = {
    root: {
      ipfsDesktopApi: {}
    },
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryDesktop(opts)
  expect(res.ipfs).toEqual(opts.root.ipfsDesktopApi)
  expect(res.provider).toEqual('ipfs-desktop')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  done()
})
