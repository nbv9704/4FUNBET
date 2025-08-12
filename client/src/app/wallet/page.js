// client/src/app/wallet/page.js
'use client'

import { useState, useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'
import { toast } from 'react-hot-toast'

export default function WalletPage() {
  const { user, balance, bank, updateBalance, updateBank } = useUser()
  const { post, get } = useApi()

  const [activeTab, setActiveTab]           = useState('account')
  const [toId, setToId]                     = useState('')
  const [transferAmt, setTransferAmt]       = useState(0)
  const [depositAmt, setDepositAmt]         = useState(0)
  const [withdrawAmt, setWithdrawAmt]       = useState(0)
  const [loading, setLoading]               = useState(false)
  const [transactions, setTransactions]     = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [page, setPage]                     = useState(1)
  const pageSize                             = 5

  // fetch & enrich transactions when user clicks Transaction tab
  useEffect(() => {
    if (activeTab !== 'transaction') return

    setHistoryLoading(true)
    get(`/wallet/${user.id}/transactions`)
      .then(async res => {
        let txs = res.transactions
        txs = await Promise.all(txs.map(async tx => {
          if (tx.type === 'transfer') {
            if (tx.toUserId) {
              const to = await get(`/user/${tx.toUserId}`)
              return { ...tx, toUsername: to.username }
            }
            if (tx.fromUserId) {
              const from = await get(`/user/${tx.fromUserId}`)
              return { ...tx, fromUsername: from.username }
            }
          }
          return tx
        }))
        setTransactions(txs)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setHistoryLoading(false))
  }, [activeTab])

  // reset to first page whenever transactions update
  useEffect(() => {
    setPage(1)
  }, [transactions])

  if (!user)   return <Loading text="Vui lòng đăng nhập để xem Wallet." />
  if (loading) return <Loading text="Đang tải Wallet…" />

  const handleTransfer = async e => {
    e.preventDefault()
    setLoading(true)
    if (!toId.trim() || transferAmt <= 0) {
      toast.error('ID và số tiền phải hợp lệ (>0).')
      setLoading(false)
      return
    }
    try {
      const target = await get(`/user/${toId}`)
      if (!window.confirm(`Chuyển ${transferAmt} cho ${target.username}?`)) {
        setLoading(false)
        return
      }
      const res = await post(`/wallet/${user.id}/transfer`, {
        toUserId: toId, amount: transferAmt
      })
      updateBalance(res.fromBalance)
      toast.success(`You transferred ${transferAmt} to ${target.username}`)
      setToId(''); setTransferAmt(0)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async e => {
    e.preventDefault()
    setLoading(true)
    if (depositAmt <= 0) {
      toast.error('Số tiền phải > 0.')
      setLoading(false)
      return
    }
    try {
      const res = await post(`/wallet/${user.id}/bank/deposit`, { amount: depositAmt })
      updateBalance(res.balance); updateBank(res.bank)
      toast.success(`You deposited ${depositAmt} from Account to Bank`)
      setDepositAmt(0)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async e => {
    e.preventDefault()
    setLoading(true)
    if (withdrawAmt <= 0) {
      toast.error('Số tiền phải > 0.')
      setLoading(false)
      return
    }
    try {
      const res = await post(`/wallet/${user.id}/bank/withdraw`, { amount: withdrawAmt })
      updateBalance(res.balance); updateBank(res.bank)
      toast.success(`You withdrew ${withdrawAmt} from Bank to Account`)
      setWithdrawAmt(0)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // determine transactions to display on current page
  const startIdx = (page - 1) * pageSize
  const pagedTxs = transactions.slice(startIdx, startIdx + pageSize)
  const totalPages = Math.ceil(transactions.length / pageSize)

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-2">Wallet</h1>
      <p className="text-center text-base mb-6">Your Balance: {balance}</p>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 border-b border-gray-600 mb-6">
        <div className="flex justify-start">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 -mb-px ${activeTab==='account'?'border-b-2 border-blue-500 font-semibold':''}`}
          >
            Account
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => setActiveTab('transaction')}
            className={`px-4 py-2 -mb-px ${activeTab==='transaction'?'border-b-2 border-blue-500 font-semibold':''}`}
          >
            Transaction
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 -mb-px ${activeTab==='bank'?'border-b-2 border-blue-500 font-semibold':''}`}
          >
            Bank
          </button>
        </div>
      </div>

      {/* Account Tab */}
      {activeTab==='account' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Transfer</h2>
          <form onSubmit={handleTransfer} className="flex flex-col space-y-2">
            <input
              type="text"
              placeholder="User ID to transfer"
              value={toId}
              onChange={e=>setToId(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={transferAmt}
              onChange={e=>setTransferAmt(+e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading?'Loading...':'Confirm'}
            </button>
          </form>
        </section>
      )}

      {/* Bank Tab */}
      {activeTab==='bank' && (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Bank Balance: {bank}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Deposit</h3>
              <form onSubmit={handleDeposit} className="flex items-center space-x-2 mt-1">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount to deposit"
                  value={depositAmt}
                  onChange={e=>setDepositAmt(+e.target.value)}
                  className="border rounded px-2 py-1 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  disabled={loading}
                >
                  {loading?'Loading...':'Confirm'}
                </button>
              </form>
            </div>
            <div>
              <h3 className="text-lg font-medium">Withdraw</h3>
              <form onSubmit={handleWithdraw} className="flex items-center space-x-2 mt-1">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount to withdraw"
                  value={withdrawAmt}
                  onChange={e=>setWithdrawAmt(+e.target.value)}
                  className="border rounded px-2 py-1 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                  disabled={loading}
                >
                  {loading?'Loading...':'Confirm'}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Transaction Tab */}
      {activeTab==='transaction' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Transaction</h2>
          {historyLoading ? (
            <Loading text="Loading transactions…" />
          ) : (
            <>
              <ul className="space-y-2">
                {pagedTxs.length > 0 ? pagedTxs.map(tx => {
                  let msg = ''
                  if (tx.type === 'deposit') {
                    msg = `You deposited ${tx.amount} from Account to Bank`
                  } else if (tx.type === 'withdraw') {
                    msg = `You withdrew ${tx.amount} from Bank to Account`
                  } else if (tx.type === 'transfer') {
                    if (tx.toUsername) msg = `You transferred ${tx.amount} to ${tx.toUsername}`
                    else if (tx.fromUsername) msg = `You received ${tx.amount} from ${tx.fromUsername}`
                  }
                  return (
                    <li key={tx._id || tx.id} className="flex flex-col">
                      <span className="text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </span>
                      <span>{msg}</span>
                    </li>
                  )
                }) : (
                  <p className="text-center text-gray-500">No transactions found.</p>
                )}
              </ul>
              {/* Pagination controls */}
              <div className="flex justify-center items-center space-x-4 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(p-1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(p+1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
