"use client";

import React from "react";
import ExcelTemplate from "@/components/excel-template";
import ExcelExport from "@/components/excel-export";
import ExcelImport from "@/components/excel-import";

const TempPage = () => {
  const templateUrl = "http://localhost:3000/excel-template/template.xlsx"; // example URLs; replace with real endpoints
  const importUrl = "http://localhost:8080/api/v1/review-form/import"; //temp endpoint for testing; replace with actual import URL
  const exportUrl = "http://localhost:8080/api/v1/review-form/export"; //temp endpoint for testing; replace with actual export URL

  return (
    <div className="flex items-center justify-center p-8 gap-2">
      <ExcelTemplate url={templateUrl} />
      <ExcelImport url={importUrl} />
      <ExcelExport url={templateUrl} />
    </div>
  );
};

export default TempPage;
