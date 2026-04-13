# SlideCue

설치 없이 웹 접속만으로 스마트폰을 PDF 발표 리모컨으로 만들어주는 대학생 특화 서비스.

## 기술 스택
- **백엔드**: Node.js, Express, Socket.IO
- **프론트**: Vanilla JavaScript (프레임워크 없음)
- **PDF 렌더링**: PDF.js (CDN)
- **QR 생성**: qrcode.js (CDN)

## 실행 방법 (로컬)

### 사전 준비
- Node.js 18 이상 설치 (https://nodejs.org)
- PC와 폰이 같은 Wi-Fi에 연결되어 있어야 함

### 설치 & 실행
```bash
cd slidecue
npm install
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 사용 방법
1. PC 브라우저에서 `http://localhost:3000` 접속
2. PDF 파일을 드래그해서 업로드
3. 화면 오른쪽 위에 뜨는 QR코드를 폰 카메라로 찍기
4. 폰 브라우저에 리모컨 화면이 뜨면 끝. 버튼으로 슬라이드 제어.

### 같은 Wi-Fi의 다른 기기에서 접속하려면
`localhost` 대신 PC의 내부 IP (예: `192.168.0.5:3000`)로 접속해야 함.
QR코드는 접속한 주소를 기반으로 자동 생성되므로, PC에서 내부 IP로 접속하면
QR코드도 해당 IP로 생성되어 폰에서 바로 접속 가능.

## 파일 구조
```
slidecue/
├── server.js          Socket.IO 서버 (세션 관리 + 메시지 중계)
├── package.json
├── README.md
└── public/
    ├── index.html     PC 발표자 화면 (PDF 뷰어 + QR)
    └── remote.html    폰 리모컨 화면
```

## 주요 기능 (v0.1)
- [x] PDF 업로드 및 슬라이드쇼 렌더링
- [x] QR코드로 폰 연결 (앱 설치 불필요)
- [x] 이전/다음 슬라이드 제어
- [x] 레이저포인터 (꾹 누르는 동안 화면에 빨간 점)
- [x] 발표 타이머
- [x] 키보드 방향키로도 넘기기 가능

## 앞으로 추가할 것
- [ ] 발표자 노트 (폰에만 표시)
- [ ] 현재 슬라이드 썸네일을 폰에 보내기
- [ ] 세션 비밀번호 (아무나 QR 찍고 들어오는 것 방지)
- [ ] 공용 서버 배포 (현재는 로컬 실행만)
