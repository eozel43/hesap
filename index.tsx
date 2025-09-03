/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Utility Functions ---

/**
 * Safely gets an HTML element by its ID. Throws an error if not found.
 */
function getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Critical Error: Element with id "${id}" not found.`);
    }
    return element as T;
}

/**
 * Represents a single calculation section in the UI (e.g., Fuel, TUFE).
 */
class CalculationSection {
    // DOM Elements
    private month1Select: HTMLSelectElement;
    private year1Select: HTMLSelectElement;
    private value1Input: HTMLInputElement;
    private month2Select: HTMLSelectElement;
    private year2Select: HTMLSelectElement;
    private value2Input: HTMLInputElement;
    public resultDiv: HTMLDivElement;

    // Properties
    private weight: number;
    private valueType: string;
    private weightedLabel: string;
    private criteriaLabel: string;

    private static MONTH_NAMES = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    constructor(idPrefix: string, weight: number, valueType: string, weightedLabel: string, criteriaLabel: string) {
        this.month1Select = getElement<HTMLSelectElement>(`${idPrefix}1-month`);
        this.year1Select = getElement<HTMLSelectElement>(`${idPrefix}1-year`);
        this.value1Input = getElement<HTMLInputElement>(`${idPrefix}1-value`);
        this.month2Select = getElement<HTMLSelectElement>(`${idPrefix}2-month`);
        this.year2Select = getElement<HTMLSelectElement>(`${idPrefix}2-year`);
        this.value2Input = getElement<HTMLInputElement>(`${idPrefix}2-value`);
        this.resultDiv = getElement<HTMLDivElement>(`result-${idPrefix}`);

        this.weight = weight;
        this.valueType = valueType;
        this.weightedLabel = weightedLabel;
        this.criteriaLabel = criteriaLabel;
    }

    /**
     * Resets the result display for this section.
     */
    public resetResult(): void {
        this.resultDiv.innerHTML = '';
        this.resultDiv.className = 'result-container';
    }

    /**
     * Calculates and displays the result for this section.
     * @returns The weighted change value, or NaN if inputs are invalid.
     */
    public calculateAndDisplay(): number {
        const fullName1 = this.getFullName(this.month1Select, this.year1Select);
        const fullName2 = this.getFullName(this.month2Select, this.year2Select);
        const value1 = parseFloat(this.value1Input.value);
        const value2 = parseFloat(this.value2Input.value);
        
        if (isNaN(value1) || isNaN(value2) || !fullName1 || !fullName2) {
             if (!isNaN(value1) || !isNaN(value2)) {
                this.showError('Lütfen tüm alanları geçerli şekilde doldurunuz.');
             }
            return NaN;
        }
        
        if (value1 <= 0) {
            this.showError("İlk değer 0'dan büyük olmalıdır.");
            return NaN;
        }

        const change = ((value2 - value1) / value1) * 100;
        const weightedChange = change * this.weight;
        
        let statusClass = 'no-change';
        if (change > 0) statusClass = 'increase';
        if (change < 0) statusClass = 'decrease';

        const changeText = change > 0 ? `${this.valueType} artışı` : `${this.valueType} düşüşü`;
        const mainResultText = change !== 0
            ? `<strong>${fullName1}</strong> & <strong>${fullName2}</strong> arası ${changeText}: <br/> <span class="percentage">%${Math.abs(change).toFixed(2)}</span>`
            : `<strong>${fullName1}</strong> ve <strong>${fullName2}</strong> arasında ${this.valueType} değişmedi.`;

        this.resultDiv.innerHTML = `
            <div class="main-result"><strong>${this.criteriaLabel}:</strong> ${mainResultText}</div>
            <div class="weighted-result">${this.weightedLabel}: <br/><span class="percentage">%${Math.abs(weightedChange).toFixed(2)}</span></div>
        `;
        this.resultDiv.classList.add('visible', statusClass);
        return weightedChange;
    }

    private showError(message: string): void {
        this.resultDiv.innerHTML = message;
        this.resultDiv.className = 'result-container visible increase';
    }
    
    private getFullName(monthSel: HTMLSelectElement, yearSel: HTMLSelectElement): string | null {
        const month = CalculationSection.MONTH_NAMES[parseInt(monthSel.value)];
        const year = yearSel.value;
        return (month && year) ? `${month} ${year}` : null;
    }

    public setupSmartListeners(): void {
         this.month1Select.addEventListener('change', () => { if (!this.year1Select.value) this.year1Select.focus(); });
         this.year1Select.addEventListener('change', () => {
            if (this.year1Select.value) {
                this.year2Select.value = this.year1Select.value;
                this.month2Select.focus();
            }
        });
    }

    public setupTufeListeners(tuikData: { [key: string]: number }): void {
        const update = (month: string, year: string, input: HTMLInputElement) => {
            if (month && year) {
                const key = `${year}-${month.padStart(2, '0')}`;
                const value = tuikData[key];
                input.value = value ? value.toString() : '';
                if (!value) input.placeholder = 'Veri yok, manuel girin';
            }
        };

        this.month1Select.addEventListener('change', () => { update(this.month1Select.value, this.year1Select.value, this.value1Input); if (!this.year1Select.value) this.year1Select.focus(); });
        this.year1Select.addEventListener('change', () => { 
            update(this.month1Select.value, this.year1Select.value, this.value1Input); 
            if (this.year1Select.value) { 
                this.year2Select.value = this.year1Select.value; 
                update(this.month2Select.value, this.year2Select.value, this.value2Input); 
                this.month2Select.focus(); 
            } 
        });
        this.month2Select.addEventListener('change', () => { update(this.month2Select.value, this.year2Select.value, this.value2Input); });
        this.year2Select.addEventListener('change', () => { update(this.month2Select.value, this.year2Select.value, this.value2Input); });
    }
}


/**
 * Main application class to manage the calculator.
 */
class CalculatorApp {
    private form: HTMLFormElement;
    private sections: CalculationSection[];
    private totalResultDiv: HTMLDivElement;
    
    private static TUIK_MOCK_DATA = {
      '2023-01': 1203.06, '2023-02': 1241.04, '2023-03': 1269.84, '2023-04': 1299.99,
      '2023-05': 1300.51, '2023-06': 1351.59, '2023-07': 1479.24, '2023-08': 1612.39,
      '2023-09': 1688.93, '2023-10': 1747.01, '2023-11': 1798.28, '2023-12': 1851.35,
      '2024-01': 1974.77, '2024-02': 2064.76, '2024-03': 2130.07, '2024-04': 2197.39,
      '2024-05': 2213.78, '2024-06': 2275.95,
    };
    
    constructor() {
        this.form = getElement<HTMLFormElement>('calculator-form');
        this.totalResultDiv = getElement<HTMLDivElement>('result-total');
        
        this.sections = [
            new CalculationSection('fuel', 0.34, 'fiyat', 'Ağırlıklı Yakıt Artış Oranı', 'Yakıt Fiyatı'),
            new CalculationSection('tufe', 0.33, 'değer', 'Ağırlıklı TÜFE Artış Oranı', 'TÜFE Değeri'),
            new CalculationSection('wage', 0.33, 'ücret', 'Ağırlıklı Asgari Ücret Artış Oranı', 'Asgari Ücret')
        ];
    }

    public initialize(): void {
        this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        this.sections[0].setupSmartListeners(); // Fuel
        this.sections[1].setupTufeListeners(CalculatorApp.TUIK_MOCK_DATA); // TUFE
        this.sections[2].setupSmartListeners(); // Wage
    }

    private handleFormSubmit(event: Event): void {
        event.preventDefault();
        
        // 1. Reset all UI results first for a clean state on every submission.
        this.sections.forEach(section => section.resetResult());
        this.totalResultDiv.className = 'total-result-container'; // Hides it and removes status classes

        // 2. Perform calculations
        const weightedChanges = this.sections.map(section => section.calculateAndDisplay());
        const validCalculations = weightedChanges.filter(v => !isNaN(v));

        // 3. Display total result only if there are valid individual results.
        if (validCalculations.length > 0) {
            const totalWeightedChange = validCalculations.reduce((sum, current) => sum + current, 0);
            
            let statusClass = 'no-change';
            if (totalWeightedChange > 0) statusClass = 'increase';
            if (totalWeightedChange < 0) statusClass = 'decrease';

            this.totalResultDiv.innerHTML = `
                <div class="total-result-label">Toplam Ağırlıklı Değişim</div>
                <div class="total-result-percentage">%${Math.abs(totalWeightedChange).toFixed(2)}</div>
            `;
            this.totalResultDiv.classList.add('visible', statusClass);
        }

        // 4. Scroll to the first visible result.
        const firstVisibleResult = this.sections.map(s => s.resultDiv).find(div => div.classList.contains('visible'));
        if (firstVisibleResult) {
            firstVisibleResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new CalculatorApp();
        app.initialize();
    } catch (error) {
        console.error(error);
        // Optionally, display a user-friendly error message on the page
        const card = document.querySelector('.calculator-card');
        if(card) card.innerHTML = '<h1>Uygulama yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</h1>';
    }
});