// File Format Converters - Convert various formats to CSV

class FormatConverters {
    constructor() {
        this.csvProcessor = new CSVProcessor();
    }

    // JSON to CSV Converter
    jsonToCSV(jsonContent) {
        try {
            let data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

            // Handle single object
            if (!Array.isArray(data)) {
                data = [data];
            }

            if (data.length === 0) {
                throw new Error('Empty JSON data');
            }

            // Flatten nested objects
            const flattenedData = data.map(item => this.flattenObject(item));

            // Get all unique keys
            const allKeys = new Set();
            flattenedData.forEach(item => {
                Object.keys(item).forEach(key => allKeys.add(key));
            });
            const headers = Array.from(allKeys);

            // Build CSV array
            const csvArray = [headers];
            flattenedData.forEach(item => {
                const row = headers.map(header => {
                    const value = item[header];
                    return value !== undefined && value !== null ? String(value) : '';
                });
                csvArray.push(row);
            });

            const csvContent = this.csvProcessor.arrayToCSV(csvArray);

            return {
                success: true,
                data: csvContent,
                stats: {
                    rows: csvArray.length - 1,
                    columns: headers.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `JSON parsing error: ${error.message}`
            };
        }
    }

    // Flatten nested JSON objects
    flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (value === null || value === undefined) {
                    flattened[newKey] = '';
                } else if (Array.isArray(value)) {
                    flattened[newKey] = JSON.stringify(value);
                } else if (typeof value === 'object' && !(value instanceof Date)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    flattened[newKey] = value;
                }
            }
        }

        return flattened;
    }

    // XML to CSV Converter
    xmlToCSV(xmlContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML format');
            }

            // Find the root element's children (assume they're records)
            const root = xmlDoc.documentElement;
            const records = Array.from(root.children);

            if (records.length === 0) {
                throw new Error('No data found in XML');
            }

            // Extract data from XML elements
            const data = records.map(record => this.xmlElementToObject(record));

            // Flatten and convert to CSV
            const flattenedData = data.map(item => this.flattenObject(item));

            // Get all unique keys
            const allKeys = new Set();
            flattenedData.forEach(item => {
                Object.keys(item).forEach(key => allKeys.add(key));
            });
            const headers = Array.from(allKeys);

            // Build CSV array
            const csvArray = [headers];
            flattenedData.forEach(item => {
                const row = headers.map(header => {
                    const value = item[header];
                    return value !== undefined && value !== null ? String(value) : '';
                });
                csvArray.push(row);
            });

            const csvContent = this.csvProcessor.arrayToCSV(csvArray);

            return {
                success: true,
                data: csvContent,
                stats: {
                    rows: csvArray.length - 1,
                    columns: headers.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `XML parsing error: ${error.message}`
            };
        }
    }

    // Convert XML element to object
    xmlElementToObject(element) {
        const obj = {};

        // Add attributes
        if (element.attributes) {
            Array.from(element.attributes).forEach(attr => {
                obj[`@${attr.name}`] = attr.value;
            });
        }

        // Add child elements
        if (element.children.length > 0) {
            Array.from(element.children).forEach(child => {
                const childObj = this.xmlElementToObject(child);
                if (obj[child.tagName]) {
                    // Handle multiple elements with same name
                    if (!Array.isArray(obj[child.tagName])) {
                        obj[child.tagName] = [obj[child.tagName]];
                    }
                    obj[child.tagName].push(childObj);
                } else {
                    obj[child.tagName] = childObj;
                }
            });
        } else {
            // Leaf node - return text content
            return element.textContent.trim();
        }

        return obj;
    }

    // Excel to CSV Converter (using SheetJS)
    excelToCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to CSV
                    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

                    // Parse to get stats
                    const parsed = this.csvProcessor.parseCSV(csvContent);

                    resolve({
                        success: true,
                        data: csvContent,
                        stats: {
                            rows: parsed.length - 1,
                            columns: parsed.length > 0 ? parsed[0].length : 0,
                            sheet: firstSheetName
                        }
                    });
                } catch (error) {
                    reject({
                        success: false,
                        error: `Excel conversion error: ${error.message}`
                    });
                }
            };

            reader.onerror = () => {
                reject({
                    success: false,
                    error: 'Failed to read Excel file'
                });
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // PDF to CSV Converter (best-effort text extraction)
    pdfToCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    // Configure PDF.js worker
                    if (typeof pdfjsLib !== 'undefined') {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 
                            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }

                    const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                    const pdf = await loadingTask.promise;

                    let allText = '';

                    // Extract text from all pages
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        allText += pageText + '\n';
                    }

                    // Try to detect tabular structure
                    const csvContent = this.textToCSVContent(allText);

                    const parsed = this.csvProcessor.parseCSV(csvContent);

                    resolve({
                        success: true,
                        data: csvContent,
                        stats: {
                            rows: parsed.length - 1,
                            columns: parsed.length > 0 ? parsed[0].length : 0,
                            pages: pdf.numPages
                        },
                        warning: 'PDF conversion is best-effort. Please verify the results.'
                    });
                } catch (error) {
                    reject({
                        success: false,
                        error: `PDF conversion error: ${error.message}`
                    });
                }
            };

            reader.onerror = () => {
                reject({
                    success: false,
                    error: 'Failed to read PDF file'
                });
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Text to CSV Converter
    textToCSV(textContent, delimiter = null) {
        try {
            const csvContent = this.textToCSVContent(textContent, delimiter);
            const parsed = this.csvProcessor.parseCSV(csvContent);

            return {
                success: true,
                data: csvContent,
                stats: {
                    rows: parsed.length - 1,
                    columns: parsed.length > 0 ? parsed[0].length : 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Text conversion error: ${error.message}`
            };
        }
    }

    // Helper to convert text to CSV format
    textToCSVContent(text, delimiter = null) {
        // Auto-detect delimiter if not provided
        if (!delimiter) {
            delimiter = this.detectTextDelimiter(text);
        }

        // Clean up text
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        // If delimiter is detected, the text is already in a delimited format
        if (delimiter === '\t' || delimiter === ',' || delimiter === ';' || delimiter === '|') {
            return lines.join('\n');
        }

        // If no clear delimiter, try to split on whitespace
        const csvLines = lines.map(line => {
            // Split on multiple spaces (2 or more)
            const fields = line.split(/\s{2,}/).map(f => f.trim());
            // Escape and join with commas
            return fields.map(field => {
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    return '"' + field.replace(/"/g, '""') + '"';
                }
                return field;
            }).join(',');
        });

        return csvLines.join('\n');
    }

    // Detect delimiter in text
    detectTextDelimiter(text) {
        const firstLine = text.split('\n')[0];
        const delimiters = ['\t', ',', ';', '|'];
        let maxCount = 0;
        let detectedDelimiter = null;

        delimiters.forEach(delimiter => {
            const count = (firstLine.match(new RegExp('\\' + (delimiter === '\t' ? 't' : delimiter), 'g')) || []).length;
            if (count > maxCount && count >= 2) {
                maxCount = count;
                detectedDelimiter = delimiter;
            }
        });

        return detectedDelimiter;
    }

    // Helper to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormatConverters;
}
