import { SalahHijriCalendar } from "./SalahHijriCalendar";
import { SalahIslamicEvents } from "./SalahIslamicEvents";
import { SalahZakahCalculator } from "./SalahZakahCalculator";

export function SalahMore() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-5">
      <SalahHijriCalendar />
      <SalahIslamicEvents />
      <SalahZakahCalculator />
    </section>
  );
}
