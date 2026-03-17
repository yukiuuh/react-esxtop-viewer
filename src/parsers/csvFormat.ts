export const decodeCsvHeaderField = (field: string): string => {
  const unwrapped = field.trim().split('"')[1] || "";

  try {
    return decodeURI(unwrapped);
  } catch {
    return unwrapped;
  }
};

export const parseCsvHeaderLine = (headerLine: string): string[] => {
  if (!headerLine) {
    throw new Error("Empty CSV file");
  }

  return headerLine
    .split(",")
    .map(decodeCsvHeaderField)
    .filter((field) => field.length > 0);
};
