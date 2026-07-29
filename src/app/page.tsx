import { ExecutiveCompTool } from "@/components/ExecutiveCompTool";
import { AppJsonLd, FaqJsonLd } from "@/components/SeoContent";

export default function OfficerCompPage() {
  return (
    <>
      <FaqJsonLd />
      <AppJsonLd />
      <ExecutiveCompTool />
    </>
  );
}
