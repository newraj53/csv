// CSV Processor - Handles CSV cleaning, parsing, and viewing

class CSVProcessor {
    constructor() {
        this.currentData = null;
        this.fileName = '';
    }

    // Detect delimiter in CSV content
    detectDelimiter(content) {
        const firstLine = content.split('\n')[0];
        const delimiters = [',', ';', '\t', '|'];
        let maxCount = 0;
        let detectedDelimiter = ',';

        delimiters.forEach(delimiter => {
            const count = (firstLine.match(new RegExp('\\' + delimiter, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                detectedDelimiter = delimiter;
            }
        });

        return detectedDelimiter;
    }

    // Parse CSV content into array
    parseCSV(content, delimiter = null) {
        if (!delimiter) {
            delimiter = this.detectDelimiter(content);
        }

        const lines = content.split('\n');
        const result = [];
        let currentRow = [];
        let currentField = '';
        let insideQuotes = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1];

                if (char === '"') {
                    if (insideQuotes && nextChar === '"') {
                        // Escaped quote
                        currentField += '"';
                        j++; // Skip next quote
                    } else {
                        // Toggle quote state
                        insideQuotes = !insideQuotes;
                    }
                } else if (char === delimiter && !insideQuotes) {
                    // Field separator
                    currentRow.push(currentField);
                    currentField = '';
                } else {
                    currentField += char;
                }
            }

            // End of line
            if (!insideQuotes) {
                currentRow.push(currentField);
                if (currentRow.length > 0) {
                    result.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            } else {
                // Multi-line field
                currentField += '\n';
            }
        }

        // Add last row if exists
        if (currentRow.length > 0) {
            result.push(currentRow);
        }

        return result;
    }

    // Convert array back to CSV string
    arrayToCSV(data, delimiter = ',') {
        return data.map(row => {
            return row.map(field => {
                // Escape fields containing delimiter, quotes, or newlines
                if (field.includes(delimiter) || field.includes('"') || field.includes('\n')) {
                    return '"' + field.replace(/"/g, '""') + '"';
                }
                return field;
            }).join(delimiter);
        }).join('\n');
    }

    // Check if a row is empty
    isRowEmpty(row) {
        return row.every(cell => !cell || cell.trim() === '');
    }

    // Check if a column is empty
    isColumnEmpty(data, colIndex) {
        return data.every(row => !row[colIndex] || row[colIndex].trim() === '');
    }

    // Remove empty rows
    removeEmptyRows(data) {
        return data.filter(row => !this.isRowEmpty(row));
    }

    // Remove empty columns
    removeEmptyColumns(data) {
        if (data.length === 0) return data;

        const maxCols = Math.max(...data.map(row => row.length));
        const columnsToKeep = [];

        for (let i = 0; i < maxCols; i++) {
            if (!this.isColumnEmpty(data, i)) {
                columnsToKeep.push(i);
            }
        }

        return data.map(row => {
            return columnsToKeep.map(colIndex => row[colIndex] || '');
        });
    }

    // Trim whitespace from all cells
    trimWhitespace(data) {
        return data.map(row => row.map(cell => cell.trim()));
    }

    // Normalize row lengths (pad with empty strings)
    normalizeRowLengths(data) {
        if (data.length === 0) return data;
        
        const maxCols = Math.max(...data.map(row => row.length));
        return data.map(row => {
            while (row.length < maxCols) {
                row.push('');
            }
            return row;
        });
    }

    // Clean CSV data
    cleanCSV(content, options = {}) {
        const {
            removeEmptyRows = true,
            removeEmptyColumns = true,
            trimWhitespace = true,
            inputDelimiter = null,
            outputDelimiter = ','
        } = options;

        try {
            // Parse CSV
            let data = this.parseCSV(content, inputDelimiter);

            // Apply cleaning operations
            if (trimWhitespace) {
                data = this.trimWhitespace(data);
            }

            if (removeEmptyRows) {
                data = this.removeEmptyRows(data);
            }

            // Normalize before removing columns
            data = this.normalizeRowLengths(data);

            if (removeEmptyColumns) {
                data = this.removeEmptyColumns(data);
            }

            // Store cleaned data
            this.currentData = data;

            // Convert back to CSV
            const cleanedCSV = this.arrayToCSV(data, outputDelimiter);

            return {
                success: true,
                data: cleanedCSV,
                stats: {
                    rows: data.length,
                    columns: data.length > 0 ? data[0].length : 0,
                    originalSize: content.length,
                    cleanedSize: cleanedCSV.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // View CSV data as table
    viewCSV(content, delimiter = null) {
        try {
            const data = this.parseCSV(content, delimiter);
            this.currentData = data;

            return {
                success: true,
                data: data,
                stats: {
                    rows: data.length,
                    columns: data.length > 0 ? data[0].length : 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate HTML table from CSV data
    generateTable(data, maxRows = 1000) {
        if (!data || data.length === 0) {
            return '<p>No data to display</p>';
        }

        const displayData = data.slice(0, maxRows);
        const hasMore = data.length > maxRows;

        let html = '<div class="result-table-wrapper"><table class="result-table">';
        
        // Header row (assume first row is header)
        html += '<thead><tr>';
        displayData[0].forEach((cell, index) => {
            html += `<th>${this.escapeHtml(cell) || `Column ${index + 1}`}</th>`;
        });
        html += '</tr></thead>';

        // Data rows
        html += '<tbody>';
        for (let i = 1; i < displayData.length; i++) {
            html += '<tr>';
            displayData[i].forEach(cell => {
                html += `<td>${this.escapeHtml(cell)}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody></table></div>';

        if (hasMore) {
            html += `<p style="margin-top: 1rem; color: var(--gray-medium);">Showing ${maxRows} of ${data.length} rows</p>`;
        }

        return html;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Download CSV file
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Get file info
    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type || 'text/csv'
        };
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVProcessor;
}
