import { PlainModeToggle } from "@/components/ui/PlainModeToggle";
import type { NavLink } from "@/lib/data/select";
import { site } from "@/lib/site";

export type { NavLink };

const linkClass = "transition-opacity duration-200 hover:opacity-70";

export function Navbar({ links }: { links: NavLink[] }) {
  return (
    <nav
      aria-label="Main"
      className="text-mist flex items-center justify-between px-6 pt-6 text-sm font-medium tracking-wider uppercase max-[359px]:px-4 max-[359px]:text-xs md:px-10 md:pt-8 md:text-lg lg:text-[1.4rem]"
    >
      <a href="#top" className={`${linkClass} font-bold`}>
        {site.shortName}
      </a>
      {links.map((link) => (
        <a key={link.href} href={link.href} className={linkClass}>
          {link.label}
        </a>
      ))}
      <PlainModeToggle />
    </nav>
  );
}
