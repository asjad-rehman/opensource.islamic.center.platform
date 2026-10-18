import { getCachedHalalResources, getCachedResourceLinks } from "@/lib/cached-content";
import React from "react";
import { Metadata } from "next";
import ResourcesClient from "@/components/resources-client";

export const metadata: Metadata = {
  title: "Islamic Resources",
  description: "Access curated online resources for learning Quran, Hadith, Islamic media, and Zakat calculators.",
};

export const revalidate = 60;

export default async function ResourcesPage() {
  const [halalResources, resourceLinks] = await Promise.all([
    getCachedHalalResources(), getCachedResourceLinks(),
  ]);
  return <ResourcesClient halalResources={halalResources} resourceLinks={resourceLinks} />;
}
