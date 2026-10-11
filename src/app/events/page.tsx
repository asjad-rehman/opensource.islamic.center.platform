import React from "react";
import { Metadata } from "next";
import { getCachedEvents } from "@/lib/cached-content";
import EventsClient, { EventItem } from "@/components/events-client";
import { parseLocalDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming events at the Islamic Center of Hattiesburg including Jumuah, Eid prayers, halaqas, and community programs.",
};

export const revalidate = 60;

async function getEvents(): Promise<EventItem[]> {
  const rawEvents = await getCachedEvents();
  const events = rawEvents.map(e => ({ ...e })); // Deep copy to avoid mutating store on render
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let e of events) {
    if (e.recurring) {
      let d = parseLocalDate(e.date);
      // Auto-forward past recurring events to the next upcoming week
      while (d < today) {
        d.setDate(d.getDate() + 7);
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      e.date = `${yyyy}-${mm}-${dd}`;
    }
  }

  // Sort events by date
  events.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // Filter out non-recurring past events
  return events.filter(e => parseLocalDate(e.date) >= today || e.recurring);
}

export default async function EventsPage() {
  const events = await getEvents();
  return <EventsClient events={events} />;
}
