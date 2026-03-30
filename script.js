(function () {
  "use strict";

  const salaryInput = document.getElementById("salary");
  const allowanceInput = document.getElementById("allowance");
  const takehomeEl = document.getElementById("takehome");
  const dedEls = {
    sss: document.getElementById("ded-sss"),
    philhealth: document.getElementById("ded-philhealth"),
    pagibig: document.getElementById("ded-pagibig"),
    tax: document.getElementById("ded-tax"),
  };
  const monetaryInputs = [salaryInput, allowanceInput];

  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function parseMoney(raw) {
    var cleaned = String(raw)
      .replace(/,/g, "")
      .replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, "")
      .trim();
    if (cleaned === "") return NaN;
    var n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }

  function formatPeso(n) {
    if (typeof n !== "number" || Number.isNaN(n) || !Number.isFinite(n)) {
      return "—";
    }
    try {
      return peso.format(n);
    } catch (e) {
      return "PHP " + n.toFixed(2);
    }
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function monthlySalaryCredit(monthlySalary) {
    var m = Number(monthlySalary);
    if (!Number.isFinite(m)) m = 0;
    if (m < 5250) return 5000;
    if (m >= 34750) return 35000;
    var k = Math.floor((m - 5250) / 500);
    return 5500 + k * 500;
  }

  function sssEmployeeShare(monthlySalary) {
    var m = Number(monthlySalary);
    if (!Number.isFinite(m) || m < 0) m = 0;
    var msc = monthlySalaryCredit(m);
    return roundMoney(msc * 0.05);
  }

  const PHILHEALTH_FLOOR = 10000;
  const PHILHEALTH_CEILING = 100000;

  function philHealthEmployeeShare(monthlySalary) {
    var m = Number(monthlySalary);
    if (!Number.isFinite(m) || m < 0) m = 0;
    var basis = Math.min(
      PHILHEALTH_CEILING,
      Math.max(PHILHEALTH_FLOOR, m),
    );
    return roundMoney(basis * 0.025);
  }

  const PAGIBIG_MFS = 10000;
  const PAGIBIG_LOW_THRESHOLD = 1500;
  const PAGIBIG_EE_CAP = 200;

  function pagIbigEmployeeShare(monthlySalary) {
    var m = Number(monthlySalary);
    if (!Number.isFinite(m) || m < 0) m = 0;
    if (m <= PAGIBIG_LOW_THRESHOLD) {
      return roundMoney(m * 0.01);
    }
    var basis = Math.min(m, PAGIBIG_MFS);
    return roundMoney(Math.min(basis * 0.02, PAGIBIG_EE_CAP));
  }

  function annualIncomeTax(annualTaxable) {
    var t = Number(annualTaxable);
    if (!Number.isFinite(t)) return 0;
    if (t <= 250000) return 0;
    if (t <= 400000) return roundMoney((t - 250000) * 0.15);
    if (t <= 800000) return roundMoney(22500 + (t - 400000) * 0.2);
    if (t <= 2000000) return roundMoney(102500 + (t - 800000) * 0.25);
    if (t <= 8000000) return roundMoney(402500 + (t - 2000000) * 0.3);
    return roundMoney(2202500 + (t - 8000000) * 0.35);
  }

  function computeDeductions(grossMonthly) {
    var g = Number(grossMonthly);
    if (!Number.isFinite(g) || g <= 0) {
      return { sss: 0, philhealth: 0, pagibig: 0, tax: 0 };
    }
    var sss = sssEmployeeShare(g);
    var philhealth = philHealthEmployeeShare(g);
    var pagibig = pagIbigEmployeeShare(g);
    var taxableMonthly = g - sss - philhealth - pagibig;
    var annualTaxable = Math.max(0, taxableMonthly) * 12;
    var taxAnnual = annualIncomeTax(annualTaxable);
    var tax = roundMoney(taxAnnual / 12);
    return { sss: sss, philhealth: philhealth, pagibig: pagibig, tax: tax };
  }

  function clearDeductionCells() {
    var cells = [dedEls.sss, dedEls.philhealth, dedEls.pagibig, dedEls.tax];
    for (var i = 0; i < cells.length; i++) {
      if (cells[i]) cells[i].textContent = "—";
    }
  }

  function scheduleRender() {
    if (scheduleRender.pending) return;
    scheduleRender.pending = true;
    requestAnimationFrame(function () {
      scheduleRender.pending = false;
      render();
    });
  }

  function render() {
    var gross = parseMoney(salaryInput.value);
    var allowanceRaw = parseMoney(allowanceInput.value);
    var allowance = Number.isFinite(allowanceRaw) ? roundMoney(allowanceRaw) : 0;

    if (!Number.isFinite(gross) || gross <= 0) {
      clearDeductionCells();
      takehomeEl.textContent = formatPeso(roundMoney(allowance));
      return;
    }

    var d = computeDeductions(gross);
    if (dedEls.sss) dedEls.sss.textContent = formatPeso(d.sss);
    if (dedEls.philhealth) dedEls.philhealth.textContent = formatPeso(d.philhealth);
    if (dedEls.pagibig) dedEls.pagibig.textContent = formatPeso(d.pagibig);
    if (dedEls.tax) dedEls.tax.textContent = formatPeso(d.tax);

    var totalDeduct = d.sss + d.philhealth + d.pagibig + d.tax;
    var takehome = Math.max(0, roundMoney(gross - totalDeduct + allowance));
    takehomeEl.textContent = formatPeso(takehome);
  }

  function formatInputCommas(inputEl) {
    const n = parseMoney(inputEl.value);
    if (!Number.isFinite(n)) {
      return;
    }
    inputEl.value = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n);
  }

  function keepFieldVisible(field) {
    var section = field.closest(".input-block");
    var anchor = section != null ? section : field;
    var opts = { block: "center", inline: "nearest", behavior: "auto" };
    var run = function () {
      anchor.scrollIntoView(opts);
    };
    requestAnimationFrame(run);
    setTimeout(run, 120);
    setTimeout(run, 350);
  }

  monetaryInputs.forEach((el) => {
    el.addEventListener("focus", () => keepFieldVisible(el));
  });

  if (window.visualViewport) {
    var vvTimer = 0;
    window.visualViewport.addEventListener("resize", function () {
      var a = document.activeElement;
      if (monetaryInputs.indexOf(a) === -1) return;
      window.clearTimeout(vvTimer);
      vvTimer = window.setTimeout(function () {
        keepFieldVisible(a);
      }, 40);
    });
  }

  function bindRecalc(el, formatOnBlur) {
    el.addEventListener("input", scheduleRender);
    el.addEventListener("change", scheduleRender);
    el.addEventListener("paste", function () {
      requestAnimationFrame(scheduleRender);
    });
    el.addEventListener("blur", function () {
      if (formatOnBlur) formatInputCommas(el);
      render();
    });
  }

  bindRecalc(salaryInput, true);
  bindRecalc(allowanceInput, true);

  render();
})();
