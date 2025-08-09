// Quick test of the scraper logic
// Use built-in fetch in Node 18+

async function testScraper() {
    console.log('Testing Georgia Probate Records scraper...');
    
    const baseUrl = 'https://georgiaprobaterecords.com/Estates/SearchEstates.aspx';
    
    try {
        // First, get the page to extract ViewState and other required form data
        console.log('Fetching initial page...');
        const initialResponse = await fetch(baseUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!initialResponse.ok) {
            throw new Error(`Failed to fetch initial page: ${initialResponse.status}`);
        }
        
        const html = await initialResponse.text();
        console.log(`Initial page loaded, HTML length: ${html.length}`);
        
        // Extract ASP.NET ViewState and other required fields
        const viewStateMatch = html.match(/id="__VIEWSTATE" value="([^"]*)"/);
        const eventValidationMatch = html.match(/id="__EVENTVALIDATION" value="([^"]*)"/);
        const viewStateGeneratorMatch = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/);
        
        if (!viewStateMatch || !eventValidationMatch) {
            console.error('Could not extract required form data');
            console.log('ViewState found:', !!viewStateMatch);
            console.log('EventValidation found:', !!eventValidationMatch);
            return;
        }
        
        console.log('Form tokens extracted successfully');
        
        // Let's also check what form fields are available
        const inputMatches = html.match(/<input[^>]*name="ctl00\$cpMain\$[^"]*"[^>]*>/gi) || [];
        console.log('Available form fields:');
        inputMatches.slice(0, 10).forEach(input => {
            const nameMatch = input.match(/name="([^"]*)"/);
            const typeMatch = input.match(/type="([^"]*)"/);
            if (nameMatch) {
                console.log(`- ${nameMatch[1]} (${typeMatch ? typeMatch[1] : 'unknown type'})`);
            }
        });
        
        // Prepare form data for search
        const formData = new URLSearchParams();
        formData.append('__VIEWSTATE', viewStateMatch[1]);
        formData.append('__EVENTVALIDATION', eventValidationMatch[1]);
        if (viewStateGeneratorMatch) {
            formData.append('__VIEWSTATEGENERATOR', viewStateGeneratorMatch[1]);
        }
        
        // Add search fields with correct names
        formData.append('ctl00$cpMain$ddlCounty', ''); // All counties
        formData.append('ctl00$cpMain$txtFirstName', '');
        formData.append('ctl00$cpMain$txtLastName', 'Smith'); // Try searching for a common name
        
        // Use correct date field names
        formData.append('ctl00$cpMain$txtDeceasedStartDate', '');
        formData.append('ctl00$cpMain$txtDeceasedStartDate$dateInput', '');
        formData.append('ctl00$cpMain$txtDeceasedEndDate', '');
        formData.append('ctl00$cpMain$txtDeceasedEndDate$dateInput', '');
        formData.append('ctl00$cpMain$txtFiledStartDate', '01/01/2020'); // Broader date range for filing
        formData.append('ctl00$cpMain$txtFiledStartDate$dateInput', '01/01/2020');
        formData.append('ctl00$cpMain$txtFiledEndDate', '');
        formData.append('ctl00$cpMain$txtFiledEndDate$dateInput', '');
        formData.append('ctl00$cpMain$btnSearch', 'Search');
        
        console.log('Submitting search request...');
        
        // Submit the search
        const searchResponse = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': baseUrl
            },
            body: formData.toString()
        });
        
        if (!searchResponse.ok) {
            throw new Error(`Search request failed: ${searchResponse.status}`);
        }
        
        const searchHtml = await searchResponse.text();
        console.log(`Search response received, HTML length: ${searchHtml.length}`);
        
        // Look for various patterns that might indicate results
        const tableMatches = searchHtml.match(/<tr[^>]*>.*?<\/tr>/gi) || [];
        const radGridMatches = searchHtml.match(/RadGrid[^>]*>/gi) || [];
        const resultMatches = searchHtml.match(/result[^>]*>/gi) || [];
        
        console.log('Analysis of response:');
        console.log('- Table rows found:', tableMatches.length);
        console.log('- RadGrid elements found:', radGridMatches.length);
        console.log('- Result elements found:', resultMatches.length);
        
        // Check for no results messages
        // Check for various "no results" patterns
        const noResultsPatterns = [
            'No records', 'no results', '0 records', 'No data', 'no data', 
            'Nothing found', 'nothing found', 'No matches', 'no matches',
            'rgNoRecords', 'rgEmptyData', 'No Items to display'
        ];
        const foundNoResults = noResultsPatterns.some(pattern => 
            searchHtml.toLowerCase().includes(pattern.toLowerCase())
        );
        if (foundNoResults) {
            console.log('No results message detected in response');
            const matchedPatterns = noResultsPatterns.filter(pattern => 
                searchHtml.toLowerCase().includes(pattern.toLowerCase())
            );
            console.log('Matched patterns:', matchedPatterns);
        }
        
        // Look for RadGrid data more specifically 
        // Try multiple patterns for RadGrid tables
        let radGridTableMatch = searchHtml.match(/<table[^>]*rgMasterTable[^>]*>(.*?)<\/table>/gi);
        if (!radGridTableMatch) {
            radGridTableMatch = searchHtml.match(/<table[^>]*id="[^"]*rgEstates[^"]*"[^>]*>(.*?)<\/table>/gi);
        }
        if (!radGridTableMatch) {
            radGridTableMatch = searchHtml.match(/<div[^>]*id="[^"]*rgEstates[^"]*"[^>]*>(.*?)<\/div>/gi);
        }
        
        if (radGridTableMatch) {
            console.log('\nFound RadGrid master table');
            const tableContent = radGridTableMatch[0];
            console.log('Table content preview:', tableContent.substring(0, 500) + '...');
            const rows = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];
            console.log(`Found ${rows.length} rows in RadGrid table`);
            
            if (rows.length > 1) { // Skip header row
                console.log('\nFirst few data rows:');
                rows.slice(1, 4).forEach((row, index) => {
                    const cells = row.match(/<td[^>]*>(.*?)<\/td>/gi) || [];
                    console.log(`Row ${index + 1}: ${cells.length} cells`);
                    cells.forEach((cell, cellIndex) => {
                        const cleanText = cell.replace(/<[^>]*>/g, '').trim();
                        if (cleanText) {
                            console.log(`  Cell ${cellIndex + 1}: ${cleanText.substring(0, 50)}...`);
                        }
                    });
                });
            }
        } else {
            console.log('No RadGrid master table found');
            
            // Look for any mention of rgEstates in the HTML
            const rgEstatesMatches = searchHtml.match(/[^<>]{0,200}rgEstates[^<>]{0,200}/gi) || [];
            console.log('rgEstates references found:', rgEstatesMatches.length);
            if (rgEstatesMatches.length > 0) {
                console.log('Sample rgEstates context:', rgEstatesMatches[0]);
            }
        }
        
        // Look for any table with data
        const allTables = searchHtml.match(/<table[^>]*>(.*?)<\/table>/gi) || [];
        console.log(`\nFound ${allTables.length} total tables`);
        
        // Look for specific patterns that might indicate data
        if (searchHtml.includes('Estate') || searchHtml.includes('Probate') || searchHtml.includes('Case')) {
            console.log('Found keywords that suggest case data might be present');
            
            // Find sections with these keywords
            const estateMatches = searchHtml.match(/[^<>]{0,100}Estate[^<>]{0,100}/gi) || [];
            console.log('Estate contexts:', estateMatches.slice(0, 3));
        }
        
    } catch (error) {
        console.error('Scraper test failed:', error.message);
    }
}

testScraper();