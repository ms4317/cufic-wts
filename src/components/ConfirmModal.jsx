import Modal from './Modal'
import { num } from '../format'

/**
 * 주문 확인 모달.
 * @param {{name:string, side:'buy'|'sell', qty:number, price:number}|null} order
 * @param {number} cash 현재 예수금 — 체결 후 잔액을 미리 보여주기 위해 받는다
 */
export default function ConfirmModal({ order, cash, onCancel, onConfirm }) {
  if (!order) return null

  const isBuy = order.side === 'buy'
  const label = isBuy ? '매수' : '매도'
  const amount = order.qty * order.price
  const after = isBuy ? cash - amount : cash + amount

  return (
    <Modal open onClose={onCancel} title="주문 확인">
      <div className="confirm">
        <p className="big">
          {order.name} <b className="num">{num(order.qty)}주</b>{' '}
          <span className={isBuy ? 'up' : 'down'}>{label}</span>
        </p>
        <p className={'amt num ' + (isBuy ? 'up' : 'down')}>₩ {num(amount)}</p>
        <p className="ask">예상 체결금액이에요. 주문하시겠습니까?</p>

        {/* 누르기 전에 결과를 미리 알 수 있게 한다 */}
        <div className="after">
          <span>체결 후 예수금</span>
          <span className="num">₩ {num(after)}</span>
        </div>
      </div>

      <div className="mfoot">
        <button className="cancel" onClick={onCancel}>
          취소
        </button>
        <button className={'act-btn ' + (isBuy ? 'buy' : 'sell')} onClick={onConfirm} autoFocus>
          확인
        </button>
      </div>
    </Modal>
  )
}
