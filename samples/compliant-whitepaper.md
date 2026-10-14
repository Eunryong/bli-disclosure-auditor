# BLI Compliant Utility Token (BLIC) — 가상자산 공시 백서 (v2.1)

**발행 주체**: BLI LegalTech Foundation  
**토큰 명칭 / 심볼**: BLI Compliant Utility Token (`BLIC`)  
**배포 네트워크**: Ethereum Sepolia Testnet (`chainId: 11155111`)  
**컨트랙트 주소**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`  
**공시 기준일**: 2026년 10월 14일  

---

## 제1조 (총발행량 상한 및 추가 발행 불가 원칙)
1. `BLIC` 토큰의 최대 총발행량(Max Supply)은 **100,000,000 BLIC (1억 개)**으로 영구 고정된다.
2. 제네시스(Genesis) 배포 시점에 전량(100,000,000 BLIC)이 일괄 발행되며, 배포 이후 어떠한 주체도 추가 발행(`mint`)을 수행할 수 없다.
3. 스마트계약 내에 `mint()` 함수가 존재하지 않으며(`mintable = false`), 소유자 권한(`owner`)은 제네시스 배포 즉시 영구 포기(`address(0)`)되어 추가 발행으로 인한 가치 희석 위험이 원천 배제된다.

## 제2조 (전송 수수료율 및 수수료 변경 불가 구조)
1. 온체인 생태계 운영 재원 확보를 위해 모든 토큰 전송(`transfer`, `transferFrom`) 시 **1.00% (100 bps)**의 고정 전송 수수료가 부과된다.
2. 전송 수수료율(`transferFeeBps = 100`)과 최대 수수료 상한(`maxTransferFeeBps = 100`)은 스마트계약 상수(`constant`)로 하드코딩되어 있으며, 배포 이후 수수료율을 인상하거나 변경할 수 있는 관리자 함수가 존재하지 않는다(`feeMutable = false`).

## 제3조 (거래 제한·일시정지 및 지갑 동결 기능 부재)
1. `BLIC` 토큰은 완전한 비수탁·무허가(Permissionless) 전송을 보장한다.
2. 스마트계약에는 전체 거래를 중단시키는 일시정지(`pause`) 기능이나 특정 사용자의 지갑 주소를 동결·차단하는 블랙리스트(`blacklist`) 기능이 일체 포함되어 있지 않다(`pausable = false`, `blacklistable = false`).

## 제4조 (팀 할당 물량 및 온체인 타임락 보호)
1. 총발행량의 20%에 해당하는 **20,000,000 BLIC**은 핵심 개발팀 할당 물량으로 지정 지갑(`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)에 배정된다.
2. 해당 팀 물량은 스마트계약 내부 전송 로직(`_transfer`)에 의해 **2028년 1월 1일 00:00:00 UTC (`releaseTimestamp: 1830297600`)**까지 온체인에서 강제 락업(`teamLockupActive = true`)되며, 해제 시각 이전에는 어떠한 경우에도 외부 이체가 불가능하다.

## 제5조 (컨트랙트 불변성 및 프록시 업그레이드 불가)
1. `BLIC` 스마트계약은 프록시(Proxy) 패턴을 사용하지 않는 단일 불변(Immutable) 컨트랙트로 배포된다(`upgradeable = false`).
2. 배포 이후 비즈니스 로직을 교체하거나 스토리지 슬롯을 덮어쓸 수 있는 관리자 계정(`adminAddress = address(0)`)이 존재하지 않으므로, 투자자는 공시된 코드 그대로의 실행을 보장받는다.
