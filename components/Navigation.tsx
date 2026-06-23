import Link from "next/link";
import { EmailButton } from "./EmailButton";

type NavigationProps = {
  isCase?: boolean;
  viewToggle?: React.ReactNode;
};

export function Navigation({ isCase = false, viewToggle }: NavigationProps) {
  return (
    <nav className={`nav${isCase ? " case-nav" : ""}`}>
      {isCase ? (
        <Link className="nav__link" href="/">
          ← Seva Kudryavtsev
        </Link>
      ) : null}
      <div className="nav-right">
        {viewToggle}
        <a
          className="nav__link"
          href="https://www.linkedin.com/in/5p17f1re/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <EmailButton />
      </div>
    </nav>
  );
}
