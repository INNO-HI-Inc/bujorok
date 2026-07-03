export function PrivacyPage() {
  return (
    <div className="prose fade-up">
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>프라이버시 안내</h1>
      <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
        부조 장부는 이름·금액·관계가 담긴 민감한 기록입니다. 부조록은 이 데이터를 남의 서버에 두지
        않도록 설계했습니다.
      </p>

      <h2>서버가 없습니다</h2>
      <p>
        부조록은 <strong>완전 정적 웹앱</strong>입니다. 회원가입도, 로그인도, 운영 서버도 없습니다.
        페이지 파일(HTML/JS)을 내려받는 것 외에 부조록이 운영하는 어떤 서버로도 데이터가 전송되지
        않습니다.
      </p>

      <h2>데이터는 내 브라우저에만 저장됩니다</h2>
      <ul>
        <li>
          <strong>행사·장부 항목·사진 썸네일</strong> — 브라우저 내장 데이터베이스(IndexedDB)
        </li>
        <li>
          <strong>API 키·라이선스 키·설정</strong> — 브라우저 localStorage
        </li>
      </ul>
      <p>
        같은 기기의 같은 브라우저에서만 데이터가 보입니다. 다른 기기와 자동 동기화되지 않으며,
        브라우저 데이터를 지우면 함께 삭제됩니다. 중요한 장부는 CSV/엑셀로 내보내 보관하세요.
      </p>

      <h2>AI 인식 시에만, Anthropic으로 직접 전송</h2>
      <p>
        봉투·장부 사진을 AI로 판독할 때만, 압축된 이미지가 <strong>내 브라우저에서 Anthropic API
        (api.anthropic.com)로 직접</strong> 전송됩니다. 중간 서버를 거치지 않으며, 호출 비용은 내
        Anthropic 계정에 과금됩니다(장당 약 10~30원). Anthropic API로 전송된 데이터의 처리 방침은{' '}
        <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">
          Anthropic 개인정보 처리방침 ↗
        </a>
        을 따릅니다. API 키 없이 쓰고 싶다면 데모 모드로 전체 기능을 체험할 수 있습니다.
      </p>

      <h2>API 키 보관</h2>
      <p>
        Claude API 키는 이 기기 브라우저의 localStorage에만 저장되며,{' '}
        <strong>Anthropic 외 어디에도 전송되지 않습니다.</strong> 설정 화면에서 언제든 삭제할 수
        있습니다. 공용 PC에서는 사용 후 키를 삭제하는 것을 권장합니다.
      </p>

      <h2>프리미엄 라이선스도 오프라인 검증</h2>
      <p>
        라이선스 키는 공개키 서명(Ed25519)을 <strong>브라우저 안에서</strong> 검증합니다. 인증
        서버에 접속하지 않으므로, 라이선스 사용 여부조차 외부로 전송되지 않습니다.
      </p>

      <h2>데이터 삭제</h2>
      <ul>
        <li>행사별 삭제 — 행사 화면의 '행사 삭제' 버튼</li>
        <li>전체 삭제 — 설정 → '모든 장부 데이터 삭제'</li>
        <li>브라우저의 사이트 데이터 삭제로도 완전히 제거됩니다</li>
      </ul>

      <h2>요약</h2>
      <p>
        <strong>
          부조록은 여러분의 부조 기록을 볼 수도, 저장할 수도 없습니다. 데이터의 주인은 처음부터
          끝까지 여러분입니다.
        </strong>
      </p>
    </div>
  );
}
