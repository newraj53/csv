// Main JavaScript - Handles UI interactions and tool orchestration

document.addEventListener('DOMContentLoaded', () => {
    // Initialize processors
    const csvProcessor = new CSVProcessor();
    const converters = new FormatConverters();

    // Current state
    let currentCleanedData = null;
    let currentConvertedData = null;
    let currentFileName = 'cleaned.csv';

    // ===== Navigation & Mobile Menu =====
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            }
        });
    }

    // ===== Scroll Animations =====
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    
    const revealOnScroll = () => {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100 && elementBottom > 0) {
                element.classList.add('revealed');
            }
        });
    };

    // Initial check
    revealOnScroll();
    
    // On scroll
    window.addEventListener('scroll', revealOnScroll);

    // ===== Tool Tab Switching =====
    const toolTabs = document.querySelectorAll('.tool-tab');
    const toolContents = document.querySelectorAll('.tool-content');

    toolTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const toolName = tab.getAttribute('data-tool');
            
            // Remove active class from all tabs and contents
            toolTabs.forEach(t => t.classList.remove('active'));
            toolContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${toolName}-tool`).classList.add('active');
        });
    });

    // ===== CSV Cleaner Tool =====
    const cleanerUpload = document.getElementById('cleanerUpload');
    const cleanerFileInput = document.getElementById('cleanerFileInput');
    const cleanBtn = document.getElementById('cleanBtn');
    const downloadCleanedBtn = document.getElementById('downloadCleanedBtn');
    const cleanerResult = document.getElementById('cleanerResult');

    if (cleanerUpload && cleanerFileInput) {
        // Click to upload
        cleanerUpload.addEventListener('click', () => {
            cleanerFileInput.click();
        });

        // File selection
        cleanerFileInput.addEventListener('change', (e) => {
            handleCleanerFile(e.target.files[0]);
        });

        // Drag and drop
        cleanerUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            cleanerUpload.classList.add('drag-over');
        });

        cleanerUpload.addEventListener('dragleave', () => {
            cleanerUpload.classList.remove('drag-over');
        });

        cleanerUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            cleanerUpload.classList.remove('drag-over');
            handleCleanerFile(e.dataTransfer.files[0]);
        });
    }

    // Handle cleaner file upload
    function handleCleanerFile(file) {
        if (!file) return;

        currentFileName = file.name.replace(/\.[^/.]+$/, '') + '_cleaned.csv';

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            cleanBtn.disabled = false;
            cleanBtn.onclick = () => cleanCSVFile(content);
            
            cleanerResult.innerHTML = `
                <div class="result-info">
                    <i class="fas fa-file-csv"></i>
                    <p>File loaded: ${file.name} (${csvProcessor.formatFileSize(file.size)})</p>
                </div>
            `;
            cleanerResult.style.display = 'block';
        };
        reader.readAsText(file);
    }

    // Clean CSV file
    function cleanCSVFile(content) {
        const options = {
            removeEmptyRows: document.getElementById('removeEmptyRows').checked,
            removeEmptyColumns: document.getElementById('removeEmptyColumns').checked,
            trimWhitespace: document.getElementById('trimWhitespace').checked,
            outputDelimiter: document.getElementById('outputDelimiter').value
        };

        const result = csvProcessor.cleanCSV(content, options);

        if (result.success) {
            currentCleanedData = result.data;
            downloadCleanedBtn.disabled = false;
            
            const preview = csvProcessor.viewCSV(result.data);
            
            cleanerResult.innerHTML = `
                <div class="result-info">
                    <i class="fas fa-check-circle"></i>
                    <p>CSV cleaned successfully! Rows: ${result.stats.rows}, Columns: ${result.stats.columns}</p>
                </div>
                ${csvProcessor.generateTable(preview.data, 100)}
            `;
        } else {
            cleanerResult.innerHTML = `
                <div class="result-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error: ${result.error}</p>
                </div>
            `;
        }
    }

    // Download cleaned CSV
    if (downloadCleanedBtn) {
        downloadCleanedBtn.addEventListener('click', () => {
            if (currentCleanedData) {
                csvProcessor.downloadCSV(currentCleanedData, currentFileName);
            }
        });
    }

    // ===== CSV Viewer Tool =====
    const viewerUpload = document.getElementById('viewerUpload');
    const viewerFileInput = document.getElementById('viewerFileInput');
    const viewerResult = document.getElementById('viewerResult');

    if (viewerUpload && viewerFileInput) {
        // Click to upload
        viewerUpload.addEventListener('click', () => {
            viewerFileInput.click();
        });

        // File selection
        viewerFileInput.addEventListener('change', (e) => {
            handleViewerFile(e.target.files[0]);
        });

        // Drag and drop
        viewerUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            viewerUpload.classList.add('drag-over');
        });

        viewerUpload.addEventListener('dragleave', () => {
            viewerUpload.classList.remove('drag-over');
        });

        viewerUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            viewerUpload.classList.remove('drag-over');
            handleViewerFile(e.dataTransfer.files[0]);
        });
    }

    // Handle viewer file upload
    function handleViewerFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const delimiterSelect = document.getElementById('viewerDelimiter');
            const delimiter = delimiterSelect.value === 'auto' ? null : delimiterSelect.value;
            
            const result = csvProcessor.viewCSV(content, delimiter);

            if (result.success) {
                viewerResult.innerHTML = `
                    <div class="result-info">
                        <i class="fas fa-table"></i>
                        <p>Viewing: ${file.name} - Rows: ${result.stats.rows}, Columns: ${result.stats.columns}</p>
                    </div>
                    ${csvProcessor.generateTable(result.data, 500)}
                `;
                viewerResult.style.display = 'block';
            } else {
                viewerResult.innerHTML = `
                    <div class="result-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error: ${result.error}</p>
                    </div>
                `;
                viewerResult.style.display = 'block';
            }
        };
        reader.readAsText(file);
    }

    // Update viewer on delimiter change
    const viewerDelimiter = document.getElementById('viewerDelimiter');
    if (viewerDelimiter) {
        viewerDelimiter.addEventListener('change', () => {
            if (viewerFileInput.files[0]) {
                handleViewerFile(viewerFileInput.files[0]);
            }
        });
    }

    // ===== Converter Tool =====
    const converterUpload = document.getElementById('converterUpload');
    const converterFileInput = document.getElementById('converterFileInput');
    const converterType = document.getElementById('converterType');
    const convertBtn = document.getElementById('convertBtn');
    const downloadConvertedBtn = document.getElementById('downloadConvertedBtn');
    const converterResult = document.getElementById('converterResult');

    // Update file input accept attribute based on converter type
    if (converterType && converterFileInput) {
        converterType.addEventListener('change', () => {
            const type = converterType.value;
            const acceptMap = {
                'json': '.json',
                'xml': '.xml',
                'excel': '.xls,.xlsx',
                'pdf': '.pdf',
                'text': '.txt,.log,.tsv'
            };
            converterFileInput.setAttribute('accept', acceptMap[type] || '*');
            
            // Reset state
            convertBtn.disabled = true;
            downloadConvertedBtn.disabled = true;
            converterResult.style.display = 'none';
        });
    }

    if (converterUpload && converterFileInput) {
        // Click to upload
        converterUpload.addEventListener('click', () => {
            converterFileInput.click();
        });

        // File selection
        converterFileInput.addEventListener('change', (e) => {
            handleConverterFile(e.target.files[0]);
        });

        // Drag and drop
        converterUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            converterUpload.classList.add('drag-over');
        });

        converterUpload.addEventListener('dragleave', () => {
            converterUpload.classList.remove('drag-over');
        });

        converterUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            converterUpload.classList.remove('drag-over');
            handleConverterFile(e.dataTransfer.files[0]);
        });
    }

    // Handle converter file upload
    function handleConverterFile(file) {
        if (!file) return;

        currentFileName = file.name.replace(/\.[^/.]+$/, '') + '.csv';
        convertBtn.disabled = false;
        
        converterResult.innerHTML = `
            <div class="result-info">
                <i class="fas fa-file"></i>
                <p>File loaded: ${file.name} (${csvProcessor.formatFileSize(file.size)})</p>
            </div>
        `;
        converterResult.style.display = 'block';

        convertBtn.onclick = () => convertFile(file);
    }

    // Convert file to CSV
    async function convertFile(file) {
        const type = converterType.value;
        
        converterResult.innerHTML = `
            <div class="result-info">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Converting ${file.name}...</p>
            </div>
        `;

        try {
            let result;

            switch (type) {
                case 'json':
                    const jsonContent = await converters.readFileAsText(file);
                    result = converters.jsonToCSV(jsonContent);
                    break;

                case 'xml':
                    const xmlContent = await converters.readFileAsText(file);
                    result = converters.xmlToCSV(xmlContent);
                    break;

                case 'excel':
                    result = await converters.excelToCSV(file);
                    break;

                case 'pdf':
                    result = await converters.pdfToCSV(file);
                    break;

                case 'text':
                    const textContent = await converters.readFileAsText(file);
                    result = converters.textToCSV(textContent);
                    break;

                default:
                    result = { success: false, error: 'Unknown converter type' };
            }

            if (result.success) {
                currentConvertedData = result.data;
                downloadConvertedBtn.disabled = false;

                const preview = csvProcessor.viewCSV(result.data);
                
                let warningHtml = '';
                if (result.warning) {
                    warningHtml = `
                        <div style="padding: 1rem; background: var(--warning-color); color: white; border-radius: var(--border-radius); margin-bottom: 1rem;">
                            <i class="fas fa-exclamation-triangle"></i> ${result.warning}
                        </div>
                    `;
                }

                converterResult.innerHTML = `
                    ${warningHtml}
                    <div class="result-info">
                        <i class="fas fa-check-circle"></i>
                        <p>Conversion successful! Rows: ${result.stats.rows}, Columns: ${result.stats.columns}</p>
                    </div>
                    ${csvProcessor.generateTable(preview.data, 100)}
                `;
            } else {
                converterResult.innerHTML = `
                    <div class="result-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error: ${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            converterResult.innerHTML = `
                <div class="result-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }

    // Download converted CSV
    if (downloadConvertedBtn) {
        downloadConvertedBtn.addEventListener('click', () => {
            if (currentConvertedData) {
                csvProcessor.downloadCSV(currentConvertedData, currentFileName);
            }
        });
    }

    // ===== Contact Form =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formSuccess = document.getElementById('formSuccess');
            const formError = document.getElementById('formError');
            
            // Validate form
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !subject || !message) {
                formError.style.display = 'flex';
                formSuccess.style.display = 'none';
                return;
            }
            
            // Simulate form submission (in real app, would send to server)
            contactForm.style.display = 'none';
            formError.style.display = 'none';
            formSuccess.style.display = 'flex';
            
            // Reset form after delay
            setTimeout(() => {
                contactForm.reset();
                contactForm.style.display = 'flex';
                formSuccess.style.display = 'none';
            }, 5000);
        });
    }

    // ===== Smooth Scroll for Anchor Links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});
