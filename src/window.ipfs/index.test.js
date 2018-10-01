/* global it, expect, jest */
import tryCompanion from './index.js'

it('Should connect to window.ipfs', async (done) => {
  const opts = {
    root: {
      ipfs: {}
    },
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryCompanion(opts)
  expect(res.ipfs).toEqual(opts.root.ipfs)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  done()
})
