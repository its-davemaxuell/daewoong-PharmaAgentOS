import Link from "next/link";
import { ArrowLeft } from "@/components/icons/ArrowLeft";
import { BilingualText } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main id="main-content" className="state-page" tabIndex={-1}>
      <p className="eyebrow">
        <BilingualText en="404 · Record unavailable" ko="404 · 레코드를 찾을 수 없음" />
      </p>
      <h1>
        <BilingualText
          en="This page or record could not be found."
          ko="페이지 또는 기록을 찾을 수 없습니다."
        />
      </h1>
      <p>
        <BilingualText
          en="Check the address or return to the source library to continue."
          ko="주소를 확인하거나 원문 자료실로 돌아가서 계속하세요."
        />
      </p>
      <Link className="button button--primary" href="/drug-letters">
        <ArrowLeft size={16} aria-hidden="true" />
        <BilingualText en="Return to Drug Letters" ko="의약품 경고서한으로 돌아가기" />
      </Link>
    </main>
  );
}
