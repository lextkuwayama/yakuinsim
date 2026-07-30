import { ExecutiveCompTool } from "@/components/ExecutiveCompTool";
import { AppJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/SeoContent";

export default function OfficerCompPage() {
  return (
    <>
      <FaqJsonLd />
      <BreadcrumbJsonLd />
      <AppJsonLd />
      <ExecutiveCompTool />
    </>
  );
}
