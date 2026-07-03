import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, FREE_AI_LIMIT, PAYMENT_LINK, PRICE_EVENT, PRICE_LIFETIME } from '../config';
import { Modal } from './Modal';

interface PurchaseModalProps {
  onClose: () => void;
}

export function PurchaseModal({ onClose }: PurchaseModalProps) {
  return (
    <Modal title="부조록 프리미엄" onClose={onClose} wide>
      <p style={{ margin: '0 0 4px', color: 'var(--ink-2)', fontSize: 14.5 }}>
        인식 제한 없이, 서식 있는 엑셀과 답례 문자까지. 결제 후 이메일로 받은{' '}
        <strong>라이선스 키</strong>를{' '}
        <Link to="/settings" onClick={onClose}>
          설정
        </Link>
        에 입력하면 즉시 잠금이 해제됩니다.
      </p>

      <div className="price-cols">
        <div className="price-card">
          <div className="plan">행사 1회권</div>
          <div className="price num">{PRICE_EVENT.toLocaleString('ko-KR')}원</div>
          <div className="per">행사 1건에 귀속 · 그 행사에서 무제한</div>
          <a className="btn btn-ghost" href={PAYMENT_LINK} style={{ width: '100%' }}>
            구매하기
          </a>
        </div>
        <div className="price-card best">
          <span className="best-badge">추천</span>
          <div className="plan">평생권</div>
          <div className="price num">{PRICE_LIFETIME.toLocaleString('ko-KR')}원</div>
          <div className="per">모든 행사 · 기간 제한 없음 · 1회 결제</div>
          <a className="btn btn-seal" href={PAYMENT_LINK} style={{ width: '100%' }}>
            구매하기
          </a>
        </div>
      </div>

      <table className="compare-table">
        <thead>
          <tr>
            <th>기능</th>
            <th>무료</th>
            <th>프리미엄</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>행사 만들기 · 장부 관리</td>
            <td className="yes">무제한</td>
            <td className="yes">무제한</td>
          </tr>
          <tr>
            <td>AI 봉투·장부 인식</td>
            <td>행사당 {FREE_AI_LIMIT}건</td>
            <td className="yes">무제한</td>
          </tr>
          <tr>
            <td>CSV 내보내기</td>
            <td className="yes">✓</td>
            <td className="yes">✓</td>
          </tr>
          <tr>
            <td>서식 적용 엑셀(.xlsx) 내보내기</td>
            <td className="no">—</td>
            <td className="yes">✓</td>
          </tr>
          <tr>
            <td>관계별 존댓말 답례 문자 생성</td>
            <td className="no">—</td>
            <td className="yes">✓</td>
          </tr>
          <tr>
            <td>데이터 저장 위치</td>
            <td colSpan={2} style={{ textAlign: 'center', color: 'var(--ink-2)' }}>
              항상 내 브라우저 (서버 미전송)
            </td>
          </tr>
        </tbody>
      </table>

      <p className="hint" style={{ marginTop: 14 }}>
        결제 확인 후 24시간 이내에 라이선스 키를 이메일로 보내드립니다. 문의: {CONTACT_EMAIL}
      </p>
    </Modal>
  );
}
