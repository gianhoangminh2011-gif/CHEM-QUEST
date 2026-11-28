
/**
 * CHEM QUEST — Independent Chemistry Question Bank
 * Version: 1.0.0
 * Records: 30
 * Type: MCQ_SINGLE_SELECT
 *
 * QDA: exactly 20 ordered fields.
 * Answer keys are stored separately from question records.
 * Scientific Verification is intentionally null pending SME review.
 */

export type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";

export interface QuestionChoice {
  readonly id: "A" | "B" | "C" | "D";
  readonly text: string;
}

export type QdaField =
  | "Question ID"
  | "Template ID"
  | "Topic"
  | "Grade Level"
  | "Curriculum"
  | "Difficulty"
  | "Question Type"
  | "Correct Answer"
  | "Explanation"
  | "Parameter Rules"
  | "Answer Generation Method"
  | "Verification Method"
  | "Mastery Node"
  | "Scientific Verification"
  | "Reviewer"
  | "Review Date"
  | "Status"
  | "Language"
  | "Version"
  | "Source";

export interface QdaRecord {
  readonly "Question ID": unknown;
  readonly "Template ID": unknown;
  readonly "Topic": unknown;
  readonly "Grade Level": unknown;
  readonly "Curriculum": unknown;
  readonly "Difficulty": unknown;
  readonly "Question Type": unknown;
  readonly "Correct Answer": unknown;
  readonly "Explanation": unknown;
  readonly "Parameter Rules": unknown;
  readonly "Answer Generation Method": unknown;
  readonly "Verification Method": unknown;
  readonly "Mastery Node": unknown;
  readonly "Scientific Verification": unknown;
  readonly "Reviewer": unknown;
  readonly "Review Date": unknown;
  readonly "Status": unknown;
  readonly "Language": unknown;
  readonly "Version": unknown;
  readonly "Source": unknown;
}

export interface ChemistryQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly QuestionChoice[];
  readonly answerKeyId: string;
  readonly explanation: string;
  readonly qda: QdaRecord;
}

export interface AnswerKey {
  readonly questionId: string;
  readonly correctChoiceId: "A" | "B" | "C" | "D";
}

const SOURCE_ATOMS =
  "OpenStax Chemistry 2e, Chapter 2: Atoms, Molecules, and Ions; " +
  "https://openstax.org/books/chemistry-2e/pages/index";

const SOURCE_MOLES =
  "OpenStax Chemistry 2e, Chapter 3: Composition of Substances and Solutions; " +
  "https://openstax.org/books/chemistry-2e/pages/index";

const SOURCE_REACTIONS =
  "OpenStax Chemistry 2e, Chapter 4: Stoichiometry of Chemical Reactions; " +
  "https://openstax.org/books/chemistry-2e/pages/4-summary";

const SOURCE_KINETICS =
  "OpenStax Chemistry 2e, Chapter 12: Kinetics; " +
  "https://openstax.org/books/chemistry-2e/pages/index";

const SOURCE_ACID_BASE =
  "OpenStax Chemistry 2e, Chapter 14: Acid-Base Equilibria; " +
  "https://openstax.org/books/chemistry-2e/pages/index";

function makeQuestion(
  number: number,
  topic: string,
  difficulty: Difficulty,
  prompt: string,
  choices: readonly QuestionChoice[],
  answer: QuestionChoice["id"],
  explanation: string,
  source: string,
): ChemistryQuestion {
  const id = `CQ-CHEM-Q${String(number).padStart(3, "0")}`;

  return {
    id,
    prompt,
    choices,
    answerKeyId: id,
    explanation,
    qda: {
      "Question ID": id,
      "Template ID": null,
      "Topic": topic,
      "Grade Level": null,
      "Curriculum": null,
      "Difficulty": difficulty,
      "Question Type": "MCQ_SINGLE_SELECT",
      "Correct Answer": null,
      "Explanation": explanation,
      "Parameter Rules": null,
      "Answer Generation Method": null,
      "Verification Method": null,
      "Mastery Node": null,
      "Scientific Verification": null,
      "Reviewer": null,
      "Review Date": null,
      "Status": "Draft",
      "Language": "vi",
      "Version": "1.0.0",
      "Source": source,
    },
  };
}

const c = (
  id: QuestionChoice["id"],
  text: string,
): QuestionChoice => ({ id, text });

export const CHEMISTRY_QUESTION_BANK_30 = [
  makeQuestion(
    1, "Atomic Structure", "D1",
    "Nguyên tử có số hiệu nguyên tử Z = 11. Số proton của nguyên tử là bao nhiêu?",
    [c("A", "10"), c("B", "11"), c("C", "12"), c("D", "23")],
    "B",
    "Số hiệu nguyên tử Z bằng số proton trong hạt nhân.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    2, "Isotopes", "D2",
    "Nguyên tử sodium-23 có Z = 11. Số neutron của nguyên tử này là bao nhiêu?",
    [c("A", "11"), c("B", "23"), c("C", "12"), c("D", "34")],
    "C",
    "Số neutron = số khối − số proton = 23 − 11 = 12.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    3, "Atomic Structure", "D1",
    "Một nguyên tử magnesium trung hòa có Z = 12. Nó có bao nhiêu electron?",
    [c("A", "12"), c("B", "10"), c("C", "24"), c("D", "6")],
    "A",
    "Nguyên tử trung hòa có số electron bằng số proton, tức bằng Z.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    4, "Periodic Table", "D2",
    "Các nguyên tố trong cùng một nhóm chính của bảng tuần hoàn thường có điểm chung nào?",
    [
      c("A", "Cùng số lớp electron"),
      c("B", "Cùng số neutron"),
      c("C", "Cùng nguyên tử khối"),
      c("D", "Có số electron hóa trị tương tự"),
    ],
    "D",
    "Các nguyên tố cùng nhóm chính thường có cấu hình electron lớp ngoài cùng tương tự.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    5, "Periodic Trends", "D3",
    "Trong một chu kỳ, khi đi từ trái sang phải, bán kính nguyên tử nhìn chung thay đổi thế nào?",
    [
      c("A", "Tăng liên tục"),
      c("B", "Giảm nhìn chung"),
      c("C", "Không thay đổi"),
      c("D", "Tăng rồi không đổi"),
    ],
    "B",
    "Điện tích hạt nhân hiệu dụng tăng, hút electron mạnh hơn nên bán kính nguyên tử nhìn chung giảm.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    6, "Chemical Formula", "D2",
    "Ion Ca²⁺ kết hợp với ion Cl⁻ tạo thành hợp chất trung hòa điện. Công thức phù hợp là gì?",
    [c("A", "CaCl"), c("B", "Ca₂Cl"), c("C", "CaCl₂"), c("D", "Ca₂Cl₂")],
    "C",
    "Một Ca²⁺ cần hai Cl⁻ để tổng điện tích bằng 0.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    7, "Chemical Bonding", "D2",
    "Liên kết ion thường được hình thành thông qua quá trình nào?",
    [
      c("A", "Chuyển electron và lực hút tĩnh điện giữa các ion"),
      c("B", "Chia sẻ đều proton"),
      c("C", "Hợp nhất hai hạt nhân"),
      c("D", "Chia sẻ neutron"),
    ],
    "A",
    "Sự chuyển electron tạo ion trái dấu; lực hút tĩnh điện giữ các ion liên kết.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    8, "Chemical Bonding", "D1",
    "Trong phân tử CO₂, các nguyên tử liên kết chủ yếu bằng loại liên kết nào?",
    [
      c("A", "Liên kết kim loại"),
      c("B", "Liên kết ion"),
      c("C", "Liên kết hydrogen"),
      c("D", "Liên kết cộng hóa trị"),
    ],
    "D",
    "Carbon và oxygen chia sẻ các cặp electron để tạo liên kết cộng hóa trị.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    9, "Chemical Equations", "D3",
    "Phương trình cân bằng của phản ứng H₂ + O₂ → H₂O là phương án nào?",
    [
      c("A", "H₂ + O₂ → H₂O₂"),
      c("B", "2H₂ + O₂ → 2H₂O"),
      c("C", "H₂ + 2O₂ → H₂O"),
      c("D", "2H₂ + 2O₂ → H₂O"),
    ],
    "B",
    "Hai vế đều có 4 nguyên tử H và 2 nguyên tử O.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    10, "Mole Concept", "D3",
    "Cho khối lượng mol của H₂O là 18 g/mol. 18 g nước tương ứng với bao nhiêu mol?",
    [c("A", "0,5 mol"), c("B", "2 mol"), c("C", "1 mol"), c("D", "18 mol")],
    "C",
    "n = m/M = 18/18 = 1 mol.",
    SOURCE_MOLES,
  ),

  makeQuestion(
    11, "Molar Mass", "D2",
    "Biết C = 12 và O = 16. Khối lượng mol của CO₂ là bao nhiêu?",
    [c("A", "28 g/mol"), c("B", "32 g/mol"), c("C", "40 g/mol"), c("D", "44 g/mol")],
    "D",
    "M(CO₂) = 12 + 2 × 16 = 44 g/mol.",
    SOURCE_MOLES,
  ),

  makeQuestion(
    12, "Molarity", "D3",
    "Hòa tan 0,5 mol chất tan để thu được 2 lít dung dịch. Nồng độ mol là bao nhiêu?",
    [c("A", "0,25 M"), c("B", "1 M"), c("C", "2,5 M"), c("D", "4 M")],
    "A",
    "C = n/V = 0,5/2 = 0,25 mol/L.",
    SOURCE_MOLES,
  ),

  makeQuestion(
    13, "Stoichiometry", "D3",
    "Theo phương trình 2Na + Cl₂ → 2NaCl, 2 mol Na phản ứng vừa đủ với bao nhiêu mol Cl₂?",
    [c("A", "2 mol"), c("B", "1 mol"), c("C", "0,5 mol"), c("D", "4 mol")],
    "B",
    "Tỷ lệ mol Na : Cl₂ là 2 : 1.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    14, "Conservation of Mass", "D2",
    "Trong một phản ứng kín, tổng khối lượng chất phản ứng là 36 g. Tổng khối lượng sản phẩm thu được là bao nhiêu nếu phản ứng hoàn toàn?",
    [c("A", "18 g"), c("B", "72 g"), c("C", "36 g"), c("D", "Phụ thuộc nhiệt độ")],
    "C",
    "Định luật bảo toàn khối lượng: tổng khối lượng được bảo toàn trong hệ kín.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    15, "Limiting Reactant", "D4",
    "Phản ứng 2H₂ + O₂ → 2H₂O. Có 4 mol H₂ và 1 mol O₂. Chất nào là chất giới hạn?",
    [
      c("A", "H₂"),
      c("B", "H₂O"),
      c("C", "Không có chất giới hạn"),
      c("D", "O₂"),
    ],
    "D",
    "1 mol O₂ chỉ cần 2 mol H₂. H₂ còn dư nên O₂ là chất giới hạn.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    16, "Mass Percentage", "D3",
    "Hòa tan 10 g NaCl vào 90 g nước. Nồng độ phần trăm khối lượng của dung dịch là bao nhiêu?",
    [c("A", "10%"), c("B", "9%"), c("C", "90%"), c("D", "11,1%")],
    "A",
    "C% = 10/(10 + 90) × 100% = 10%.",
    SOURCE_MOLES,
  ),

  makeQuestion(
    17, "Dilution", "D3",
    "Lấy 100 mL dung dịch 1 M và pha loãng thành 500 mL. Nồng độ mới là bao nhiêu?",
    [c("A", "1 M"), c("B", "5 M"), c("C", "0,2 M"), c("D", "0,5 M")],
    "C",
    "C₁V₁ = C₂V₂. C₂ = 1 × 100/500 = 0,2 M.",
    SOURCE_MOLES,
  ),

  makeQuestion(
    18, "Thermochemistry", "D2",
    "Một phản ứng làm nhiệt độ môi trường xung quanh tăng lên. Phản ứng đó thường được phân loại thế nào?",
    [
      c("A", "Thu nhiệt"),
      c("B", "Tỏa nhiệt"),
      c("C", "Không trao đổi năng lượng"),
      c("D", "Không phải phản ứng hóa học"),
    ],
    "B",
    "Phản ứng tỏa nhiệt truyền năng lượng ra môi trường, khiến môi trường có thể nóng lên.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    19, "Thermochemistry", "D2",
    "Đặc điểm chính của phản ứng thu nhiệt là gì?",
    [
      c("A", "Luôn tạo ra khí"),
      c("B", "Không cần năng lượng"),
      c("C", "Luôn tạo kết tủa"),
      c("D", "Hấp thụ năng lượng từ môi trường"),
    ],
    "D",
    "Phản ứng thu nhiệt hấp thụ nhiệt từ môi trường.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    20, "Reaction Kinetics", "D3",
    "Chất xúc tác làm tăng tốc độ phản ứng chủ yếu bằng cách nào?",
    [
      c("A", "Làm giảm năng lượng hoạt hóa"),
      c("B", "Làm tăng khối lượng sản phẩm theo định luật bảo toàn"),
      c("C", "Thay đổi nguyên tố hóa học"),
      c("D", "Luôn làm phản ứng tỏa nhiệt"),
    ],
    "A",
    "Chất xúc tác cung cấp con đường phản ứng có năng lượng hoạt hóa thấp hơn và được tái sinh trong cơ chế tổng thể.",
    SOURCE_KINETICS,
  ),

  makeQuestion(
    21, "Reaction Kinetics", "D2",
    "Khi tăng nhiệt độ, tốc độ của nhiều phản ứng hóa học tăng vì lý do nào?",
    [
      c("A", "Các nguyên tử biến mất"),
      c("B", "Năng lượng hoạt hóa luôn bằng 0"),
      c("C", "Tỷ lệ va chạm có đủ năng lượng tăng"),
      c("D", "Số proton trong hạt nhân tăng"),
    ],
    "C",
    "Nhiệt độ cao hơn làm tăng năng lượng động học và tỷ lệ va chạm đủ năng lượng để phản ứng.",
    SOURCE_KINETICS,
  ),

  makeQuestion(
    22, "Acid Base", "D1",
    "Dung dịch acid làm giấy quỳ tím chuyển sang màu nào?",
    [c("A", "Xanh"), c("B", "Đỏ"), c("C", "Không màu"), c("D", "Vàng")],
    "B",
    "Dung dịch acid làm quỳ tím chuyển đỏ.",
    SOURCE_ACID_BASE,
  ),

  makeQuestion(
    23, "pH", "D2",
    "Ở 25°C, dung dịch trung tính có pH bằng bao nhiêu?",
    [c("A", "0"), c("B", "14"), c("C", "1"), c("D", "7")],
    "D",
    "Ở 25°C, dung dịch trung tính có pH = 7.",
    SOURCE_ACID_BASE,
  ),

  makeQuestion(
    24, "Neutralization", "D3",
    "Sản phẩm của phản ứng HCl + NaOH → ? là gì?",
    [
      c("A", "NaCl và H₂O"),
      c("B", "Na₂O và H₂"),
      c("C", "Cl₂ và NaH"),
      c("D", "Na và HClO"),
    ],
    "A",
    "Acid HCl phản ứng với base NaOH tạo muối NaCl và nước.",
    SOURCE_ACID_BASE,
  ),

  makeQuestion(
    25, "Redox", "D2",
    "Trong phản ứng oxi hóa – khử, quá trình oxi hóa được định nghĩa là gì?",
    [
      c("A", "Nhận proton"),
      c("B", "Nhận electron"),
      c("C", "Nhường electron"),
      c("D", "Nhận neutron"),
    ],
    "C",
    "Oxi hóa là quá trình nhường electron; số oxi hóa của chất bị oxi hóa tăng.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    26, "Oxidation Number", "D3",
    "Trong hợp chất H₂O thông thường, số oxi hóa của oxygen là bao nhiêu?",
    [c("A", "+2"), c("B", "−2"), c("C", "0"), c("D", "+1")],
    "B",
    "Trong H₂O, hydrogen có số oxi hóa +1; tổng bằng 0 nên oxygen là −2.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    27, "Organic Chemistry", "D2",
    "Phản ứng đốt cháy hoàn toàn methane (CH₄) trong oxygen tạo ra những sản phẩm chính nào?",
    [
      c("A", "CO và H₂"),
      c("B", "C và H₂O"),
      c("C", "CH₃OH và O₂"),
      c("D", "CO₂ và H₂O"),
    ],
    "D",
    "Phương trình: CH₄ + 2O₂ → CO₂ + 2H₂O.",
    SOURCE_REACTIONS,
  ),

  makeQuestion(
    28, "Organic Chemistry", "D2",
    "Công thức tổng quát của alkane mạch hở có một vòng? Không xét vòng, chỉ xét alkane mạch hở no là gì?",
    [
      c("A", "CₙH₂ₙ₊₂"),
      c("B", "CₙH₂ₙ"),
      c("C", "CₙH₂ₙ₋₂"),
      c("D", "CₙHₙ"),
    ],
    "A",
    "Alkane mạch hở có công thức tổng quát CₙH₂ₙ₊₂.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    29, "Organic Chemistry", "D2",
    "Đặc điểm cấu tạo nổi bật của ethene (C₂H₄) là gì?",
    [
      c("A", "Có liên kết ba C≡C"),
      c("B", "Có liên kết đôi C=C"),
      c("C", "Chỉ có liên kết đơn C–C"),
      c("D", "Không có liên kết giữa hai nguyên tử carbon"),
    ],
    "B",
    "Ethene có cấu tạo CH₂=CH₂ với một liên kết đôi carbon-carbon.",
    SOURCE_ATOMS,
  ),

  makeQuestion(
    30, "Experimental Data Analysis", "D4",
    "Trong cùng điều kiện ban đầu, một thí nghiệm được lặp lại ở hai nhiệt độ. Thời gian phản ứng giảm từ 80 giây xuống 40 giây. Kết luận nào phù hợp nhất nếu dùng thời gian phản ứng làm chỉ báo tốc độ?",
    [
      c("A", "Phản ứng ở lần hai chậm hơn"),
      c("B", "Nhiệt độ không ảnh hưởng đến phản ứng"),
      c("C", "Thời gian giảm một nửa, nên tốc độ trung bình ước tính tăng khoảng hai lần"),
      c("D", "Có thể kết luận năng lượng hoạt hóa bằng 0"),
    ],
    "C",
    "Nếu cùng một mức độ hoàn thành phản ứng được dùng làm mốc, tốc độ trung bình tỷ lệ nghịch với thời gian. Thời gian giảm một nửa tương ứng tốc độ trung bình ước tính tăng khoảng hai lần. Dữ liệu này không đủ để xác định năng lượng hoạt hóa.",
    SOURCE_KINETICS,
  ),
] as const satisfies readonly ChemistryQuestion[];

/**
 * Separate answer-key registry.
 * Do not copy correctChoiceId into QDA's "Correct Answer" field
 * until the authoritative QDA mapping defines that relationship.
 */
export const CHEMISTRY_ANSWER_KEY_30 = [
  { questionId: "CQ-CHEM-Q001", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q002", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q003", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q004", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q005", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q006", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q007", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q008", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q009", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q010", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q011", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q012", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q013", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q014", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q015", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q016", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q017", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q018", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q019", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q020", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q021", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q022", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q023", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q024", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q025", correctChoiceId: "C" },
  { questionId: "CQ-CHEM-Q026", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q027", correctChoiceId: "D" },
  { questionId: "CQ-CHEM-Q028", correctChoiceId: "A" },
  { questionId: "CQ-CHEM-Q029", correctChoiceId: "B" },
  { questionId: "CQ-CHEM-Q030", correctChoiceId: "C" },
] as const satisfies readonly AnswerKey[];

/**
 * Exact ordered QDA field inventory.
 */
export const QDA_FIELD_ORDER: readonly QdaField[] = [
  "Question ID",
  "Template ID",
  "Topic",
  "Grade Level",
  "Curriculum",
  "Difficulty",
  "Question Type",
  "Correct Answer",
  "Explanation",
  "Parameter Rules",
  "Answer Generation Method",
  "Verification Method",
  "Mastery Node",
  "Scientific Verification",
  "Reviewer",
  "Review Date",
  "Status",
  "Language",
  "Version",
  "Source",
];

export function validateQuestionBank(
  questions: readonly ChemistryQuestion[] =
    CHEMISTRY_QUESTION_BANK_30,
  answerKeys: readonly AnswerKey[] =
    CHEMISTRY_ANSWER_KEY_30,
): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const keyMap = new Map<string, string>();

  for (const key of answerKeys) {
    if (keyMap.has(key.questionId)) {
      errors.push(`Duplicate answer key: ${key.questionId}`);
    }
    keyMap.set(key.questionId, key.correctChoiceId);
  }

  for (const question of questions) {
    if (seenIds.has(question.id)) {
      errors.push(`Duplicate question ID: ${question.id}`);
    }
    seenIds.add(question.id);

    if (question.prompt.trim().length === 0) {
      errors.push(`${question.id}: empty prompt`);
    }

    if (question.choices.length !== 4) {
      errors.push(`${question.id}: must have exactly four choices`);
    }

    const choiceIds = question.choices.map((choice) => choice.id);
    if (new Set(choiceIds).size !== 4) {
      errors.push(`${question.id}: duplicate choice IDs`);
    }

    if (
      !["A", "B", "C", "D"].every((id) =>
        choiceIds.includes(id as QuestionChoice["id"]),
      )
    ) {
      errors.push(`${question.id}: choices must be A, B, C, D`);
    }

    if (!question.explanation.trim()) {
      errors.push(`${question.id}: missing explanation`);
    }

    if (question.qda["Question ID"] !== question.id) {
      errors.push(`${question.id}: QDA ID mismatch`);
    }

    const actualFields = Object.keys(question.qda);
    if (
      actualFields.length !== 20 ||
      actualFields.some(
        (field, index) => field !== QDA_FIELD_ORDER[index],
      )
    ) {
      errors.push(`${question.id}: QDA field order/schema mismatch`);
    }

    if (question.qda["Question Type"] !== "MCQ_SINGLE_SELECT") {
      errors.push(`${question.id}: unsupported question type`);
    }

    if (question.qda["Scientific Verification"] !== null) {
      errors.push(`${question.id}: scientific verification must remain pending`);
    }

    if (question.answerKeyId !== question.id) {
      errors.push(`${question.id}: answer key reference mismatch`);
    }

    const correctChoice = keyMap.get(question.id);
    if (!correctChoice) {
      errors.push(`${question.id}: missing answer key`);
    } else if (!choiceIds.includes(correctChoice as QuestionChoice["id"])) {
      errors.push(`${question.id}: answer key points to missing choice`);
    }
  }

  for (const key of answerKeys) {
    if (!seenIds.has(key.questionId)) {
      errors.push(`Orphan answer key: ${key.questionId}`);
    }
  }

  return errors;
}

export function getQuestionById(
  id: string,
): ChemistryQuestion | undefined {
  return CHEMISTRY_QUESTION_BANK_30.find(
    (question) => question.id === id,
  );
}

export function getAnswerKey(
  questionId: string,
): AnswerKey | undefined {
  return CHEMISTRY_ANSWER_KEY_30.find(
    (key) => key.questionId === questionId,
  );
}

export function getQuestionsByDifficulty(
  difficulty: Difficulty,
): readonly ChemistryQuestion[] {
  return CHEMISTRY_QUESTION_BANK_30.filter(
    (question) => question.qda["Difficulty"] === difficulty,
  );
}

export function getQuestionsByTopic(
  topic: string,
): readonly ChemistryQuestion[] {
  return CHEMISTRY_QUESTION_BANK_30.filter(
    (question) => question.qda["Topic"] === topic,
  );
}

/**
 * SHA-256 snapshot fingerprint.
 * Unicode NFC and CRLF normalization are applied.
 * Choice order is part of the authored snapshot.
 */
export async function createQuestionFingerprint(
  question: ChemistryQuestion,
): Promise<string> {
  const payload = {
    schema: "CHEM-QUEST-QUESTION-SNAPSHOT-V1",
    questionId: question.id,
    questionVersion: question.qda["Version"],
    questionTypeCode: question.qda["Question Type"],
    prompt: question.prompt.normalize("NFC").replace(/\r\n?/g, "\n"),
    choices: question.choices.map((choice) => ({
      id: choice.id,
      text: choice.text.normalize("NFC").replace(/\r\n?/g, "\n"),
    })),
  };

  const canonical = "CHEM-QUEST:QUESTION-SNAPSHOT:V1\n" +
    JSON.stringify(payload);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );

  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:v1:${hex}`;
}
