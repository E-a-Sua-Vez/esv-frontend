<script>
import { ref, toRefs, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import SimpleDownloadButton from '../../reports/SimpleDownloadButton.vue';
import { getDateAndHour, getDate } from '../../../shared/utils/date';
import { lazyLoadJsPDF } from '../../../shared/utils/lazyLoad';
import Message from '../../common/Message.vue';
import HistoryDetailsWithItemsCard from '../common/HistoryDetailsWithItemsCard.vue';
import { getPrescriptionsByClient } from '../../../application/services/prescription';
import { getExamOrdersByClient } from '../../../application/services/medical-exam-order';
import { getReferencesByClient } from '../../../application/services/medical-reference';

export default {
  name: 'PatientResumeForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    HistoryDetailsCard,
    SimpleDownloadButton,
    Message,
    HistoryDetailsWithItemsCard,
  },
  props: {
    commerce: { type: Object, default: {} },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
  },
  async setup(props) {
    const loading = ref(false);
    const { t } = useI18n();

    const { commerce, patientHistoryData, toggles } = toRefs(props);

    // Load prescriptions, exam orders, and references
    const prescriptions = ref([]);
    const examOrders = ref([]);
    const references = ref([]);

    const loadAdditionalData = async () => {
      if (!commerce.value?.id || !patientHistoryData.value?.clientId) return;
      try {
        const [prescriptionsData, examOrdersData, referencesData] = await Promise.all([
          getPrescriptionsByClient(commerce.value.id, patientHistoryData.value.clientId).catch(
            () => []
          ),
          getExamOrdersByClient(commerce.value.id, patientHistoryData.value.clientId).catch(
            () => []
          ),
          getReferencesByClient(commerce.value.id, patientHistoryData.value.clientId).catch(
            () => []
          ),
        ]);
        prescriptions.value = prescriptionsData || [];
        examOrders.value = examOrdersData || [];
        references.value = referencesData || [];
      } catch (error) {
        console.error('Error loading additional data for resume:', error);
      }
    };

    onMounted(() => {
      loadAdditionalData();
    });

    const exportToPDF = async () => {
      loading.value = true;

      try {
        const jsPDF = await lazyLoadJsPDF();
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        // Generate filename
        const patientName = patientHistoryData.value?.personalData?.name
          ? `${patientHistoryData.value.personalData.name}_${
              patientHistoryData.value.personalData.lastName || ''
            }`
              .trim()
              .replace(/\s+/g, '_')
          : 'patient';
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `Prontuario_${patientName}_${dateStr}.pdf`;

        // Constants
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;
        let yPos = margin;
        const lineHeight = 7;
        const sectionSpacing = 10;

        // Helper function to add new page if needed
        const checkPageBreak = (requiredHeight = lineHeight) => {
          if (yPos + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
          }
          return false;
        };

        // Helper function to add text with word wrap
        const addText = (
          text,
          x,
          y,
          maxWidth,
          fontSize = 10,
          fontStyle = 'normal',
          color = [0, 0, 0]
        ) => {
          doc.setFontSize(fontSize);
          doc.setFont(undefined, fontStyle);
          doc.setTextColor(color[0], color[1], color[2]);

          const lines = doc.splitTextToSize(text || 'N/I', maxWidth);
          doc.text(lines, x, y);
          return lines.length * (fontSize * 0.4);
        };

        // Helper function to add section header
        const addSectionHeader = (title, icon = '') => {
          checkPageBreak(15);
          yPos += 5;
          doc.setFillColor(0, 123, 255);
          doc.rect(margin, yPos - 5, maxWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(title, margin + 3, yPos + 2);
          yPos += 12;
          doc.setTextColor(0, 0, 0);
        };

        // Two-column layout state
        let currentColumn = 0;
        let columnYPos = yPos;

        // Helper function to check if a string looks like an ID
        const isLikelyId = str => {
          if (typeof str !== 'string') return false;
          // IDs are typically long alphanumeric strings (15+ chars, mostly letters/numbers)
          return str.length >= 15 && /^[A-Za-z0-9]+$/.test(str) && str.length <= 30;
        };

        // Helper function to safely convert any value to string
        const safeString = value => {
          if (value === null || value === undefined) {
            return 'N/I';
          }
          if (typeof value === 'string') {
            // Filter out ID-like strings
            if (isLikelyId(value)) {
              return '';
            }
            return value;
          }
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          if (Array.isArray(value)) {
            const filtered = value
              .map(item => safeString(item))
              .filter(item => item && item.trim().length > 0 && !isLikelyId(item));
            return filtered.length > 0 ? filtered.join(', ') : '';
          }
          if (typeof value === 'object') {
            // Exclude common ID fields
            const excludeFields = ['id', '_id', '__v', 'createdAt', 'updatedAt', 'modifiedAt'];
            const filteredObj = { ...value };
            excludeFields.forEach(field => delete filteredObj[field]);

            // Handle objects - try to extract meaningful data
            if (filteredObj.name && filteredObj.value !== undefined) {
              const val = safeString(filteredObj.value);
              return val ? `${filteredObj.name}: ${val}` : filteredObj.name;
            }
            if (filteredObj.name) {
              return filteredObj.name;
            }
            if (filteredObj.value !== undefined) {
              return safeString(filteredObj.value);
            }
            // If it's an object with keys, format as key-value pairs (excluding IDs)
            const entries = Object.entries(filteredObj).filter(([k, v]) => {
              // Exclude ID fields and ID-like values
              if (excludeFields.includes(k)) return false;
              if (typeof v === 'string' && isLikelyId(v)) return false;
              return v !== null && v !== undefined;
            });
            if (entries.length > 0) {
              const pairs = entries
                .map(([k, v]) => {
                  const val = safeString(v);
                  return val ? `${k}: ${val}` : null;
                })
                .filter(Boolean);
              return pairs.length > 0 ? pairs.join(', ') : '';
            }
            return '';
          }
          return String(value);
        };

        // Helper function to add label-value pair
        const addField = (label, value, isFullWidth = false) => {
          if (isFullWidth) {
            // Full width field - reset column
            checkPageBreak(10);
            currentColumn = 0;
            columnYPos = yPos;
            yPos += 5;
          } else {
            // Two-column layout
            if (currentColumn === 0) {
              checkPageBreak(10);
              columnYPos = yPos;
              yPos += 5;
            }
          }

          const fieldWidth = isFullWidth ? maxWidth : (maxWidth - 5) / 2;
          const xPos = isFullWidth ? margin : margin + (currentColumn * (maxWidth + 5)) / 2;

          // Label
          doc.setFontSize(7);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text(label, xPos, yPos);

          // Value - safely convert to string
          const safeValue = safeString(value);
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          const valueLines = doc.splitTextToSize(safeValue, fieldWidth - 3);
          doc.text(valueLines, xPos, yPos + 4);

          const fieldHeight = valueLines.length * 3.5 + 6;

          if (isFullWidth) {
            yPos += fieldHeight;
            currentColumn = 0;
          } else {
            if (currentColumn === 0) {
              columnYPos = yPos + fieldHeight;
              currentColumn = 1;
            } else {
              yPos = Math.max(columnYPos, yPos + fieldHeight);
              currentColumn = 0;
            }
          }
        };

        // Header Section
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, maxWidth, 35, 'F');

        // Clinic Name
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(commerce.value?.name || 'Clínica', pageWidth / 2, yPos + 8, { align: 'center' });

        // Clinic Details
        if (commerce.value?.address || commerce.value?.phone || commerce.value?.email) {
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100, 100, 100);
          const clinicDetails = [commerce.value.address, commerce.value.phone, commerce.value.email]
            .filter(Boolean)
            .join(' | ');
          doc.text(clinicDetails, pageWidth / 2, yPos + 14, { align: 'center' });
        }

        // Patient Title
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('PRONTUÁRIO MÉDICO', pageWidth / 2, yPos + 22, { align: 'center' });

        // Patient Name
        const patientFullName = `${patientHistoryData.value?.personalData?.name || ''} ${
          patientHistoryData.value?.personalData?.lastName || ''
        }`.trim();
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(patientFullName || 'N/I', pageWidth / 2, yPos + 30, { align: 'center' });

        yPos += 40;

        // Document Meta Info
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const genDate = getDateAndHour(new Date());
        const updateDate =
          patientHistoryData.value?.modifiedAt || patientHistoryData.value?.updatedDate
            ? getDateAndHour(
                patientHistoryData.value.modifiedAt || patientHistoryData.value.updatedDate
              )
            : null;
        doc.text(`Documento gerado em: ${genDate}`, margin, yPos);
        if (updateDate) {
          doc.text(`Última atualização: ${updateDate}`, pageWidth - margin, yPos, {
            align: 'right',
          });
        }
        yPos += 8;

        // Draw line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += sectionSpacing;

        // Personal Data Section
        if (patientHistoryData.value?.personalData) {
          const pd = patientHistoryData.value.personalData;
          addSectionHeader('DADOS PESSOAIS');
          currentColumn = 0; // Reset column for new section

          addField('Nome', pd.name || 'N/I', false);
          addField('Sobrenome', pd.lastName || 'N/I', false);

          addField('CPF/Passaporte', pd.idNumber || 'N/I', false);
          addField('Data de Nascimento', pd.birthday ? getDate(pd.birthday) : 'N/I', false);

          addField('Idade', pd.age ? `${pd.age} anos` : 'N/I', false);
          addField(
            'Estado Civil',
            pd.civilStatus ? t(`civilStatuses.${pd.civilStatus}`) : 'N/I',
            false
          );

          addField('Sexo', pd.sex ? t(`sexs.${pd.sex}`) : 'N/I', false);
          addField('Ocupação', pd.occupation || 'N/I', false);

          addField('Endereço (Texto)', pd.addressText || 'N/I', true);

          addField('Endereço (CEP)', pd.addressCode || 'N/I', false);
          addField('Endereço (Complemento)', pd.addressComplement || 'N/I', false);

          addField(
            'Telefone',
            pd.phone ? `${pd.phoneCode || ''} ${pd.phone || ''}`.trim() : 'N/I',
            false
          );
          addField('Email', pd.email || 'N/I', false);

          addField('Fonte dos dados é o Paciente', pd.font ? 'Sim' : 'Não', false);

          yPos += sectionSpacing;
        }

        // Consultation Reason Section
        if (patientHistoryData.value?.consultationReason?.length > 0) {
          addSectionHeader('MOTIVO DA CONSULTA');
          patientHistoryData.value.consultationReason.forEach((item, index) => {
            checkPageBreak(15);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const reasonText = safeString(item.reason);
            const reasonLines = doc.splitTextToSize(reasonText, maxWidth);
            doc.text(reasonLines, margin + 5, yPos);
            yPos += reasonLines.length * 4 + 5;
          });
          yPos += sectionSpacing;
        }

        // Current Illness Section
        if (patientHistoryData.value?.currentIllness?.length > 0) {
          addSectionHeader('DOENÇA ATUAL');
          patientHistoryData.value.currentIllness.forEach(item => {
            checkPageBreak(15);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const illnessText = safeString(item.illness);
            const illnessLines = doc.splitTextToSize(illnessText, maxWidth);
            doc.text(illnessLines, margin + 5, yPos);
            yPos += illnessLines.length * 4 + 5;
          });
          yPos += sectionSpacing;
        }

        // Patient Anamnese Section
        if (patientHistoryData.value?.patientAnamnese) {
          addSectionHeader('HISTÓRIA PESSOAL');

          if (patientHistoryData.value.patientAnamnese.habitsDetails) {
            Object.keys(patientHistoryData.value.patientAnamnese.habitsDetails).forEach(key => {
              const item = patientHistoryData.value.patientAnamnese.habitsDetails[key];
              checkPageBreak(20);

              // Title
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(0, 0, 0);
              doc.text(item.title || key, margin + 3, yPos);
              yPos += 6;

              // Answer details
              if (item.characteristics?.yesNo && item.answer) {
                const answer = item.answer.answer ? 'Sim' : 'Não';
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.text(`Resposta: ${answer}`, margin + 5, yPos);
                yPos += 5;
              }

              if (item.characteristics?.check && item.answer) {
                if (item.answer.actual !== undefined) {
                  doc.setFontSize(8);
                  doc.text(
                    `Consome Atualmente: ${item.answer.actual ? 'Sim' : 'Não'}`,
                    margin + 5,
                    yPos
                  );
                  yPos += 4;
                }
                if (item.answer.ageFrom) {
                  doc.text(`De (Idade): ${item.answer.ageFrom}`, margin + 5, yPos);
                  yPos += 4;
                }
                if (item.answer.ageTo) {
                  doc.text(`A (Idade): ${item.answer.ageTo}`, margin + 5, yPos);
                  yPos += 4;
                }
                if (item.answer.frequency) {
                  doc.text(
                    `Frequência: ${t(
                      `patientHistoryItemFrequenciesTypes.${item.answer.frequency}`
                    )}`,
                    margin + 5,
                    yPos
                  );
                  yPos += 4;
                }
              }

              if (item.answer?.result) {
                const resultText = safeString(item.answer.result);
                if (resultText && resultText.trim().length > 0) {
                  const resultLines = doc.splitTextToSize(resultText, maxWidth - 10);
                  doc.text(resultLines, margin + 5, yPos);
                  yPos += resultLines.length * 4;
                }
              }

              // Handle array answers (for selectN, select1, etc.)
              if (item.answer && Array.isArray(item.answer) && item.answer.length > 0) {
                // Filter out IDs and empty values
                const filteredAnswers = item.answer
                  .map(ans => safeString(ans))
                  .filter(ans => ans && ans.trim().length > 0 && !isLikelyId(ans));

                if (filteredAnswers.length > 0) {
                  const answerText = filteredAnswers.join(', ');
                  const answerLines = doc.splitTextToSize(answerText, maxWidth - 10);
                  doc.text(answerLines, margin + 5, yPos);
                  yPos += answerLines.length * 4;
                }
              }

              if (item.comment) {
                const commentText = safeString(item.comment);
                if (commentText && commentText.trim().length > 0) {
                  const commentLines = doc.splitTextToSize(commentText, maxWidth - 10);
                  doc.text(commentLines, margin + 5, yPos);
                  yPos += commentLines.length * 4;
                }
              }

              yPos += 5;
            });
          }

          if (patientHistoryData.value.patientAnamnese.habits) {
            checkPageBreak(15);
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const habitsText = safeString(patientHistoryData.value.patientAnamnese.habits);
            const habitsLines = doc.splitTextToSize(habitsText, maxWidth);
            doc.text(habitsLines, margin, yPos);
            yPos += habitsLines.length * 4 + 5;
          }

          yPos += sectionSpacing;
        }

        // Functional Exam Section
        if (patientHistoryData.value?.functionalExam?.length > 0) {
          addSectionHeader('EXAME FUNCIONAL');
          patientHistoryData.value.functionalExam.forEach(item => {
            checkPageBreak(15);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const examLines = doc.splitTextToSize(item.exam || 'N/I', maxWidth);
            doc.text(examLines, margin + 5, yPos);
            yPos += examLines.length * 4 + 5;
          });
          yPos += sectionSpacing;
        }

        // Physical Exam Section
        if (patientHistoryData.value?.physicalExam?.length > 0) {
          addSectionHeader('EXAME FÍSICO');
          patientHistoryData.value.physicalExam.forEach(item => {
            checkPageBreak(20);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;

            if (item.examDetails && Object.keys(item.examDetails).length > 0) {
              doc.setFontSize(8);
              doc.setFont(undefined, 'normal');
              doc.setTextColor(0, 0, 0);

              Object.keys(item.examDetails).forEach(key => {
                const detail = item.examDetails[key];
                let detailText = '';

                // Handle different detail structures
                if (detail && typeof detail === 'object') {
                  // If it has name and value
                  if (detail.name && detail.value !== undefined) {
                    detailText = `${detail.name}: ${safeString(detail.value)}`;
                  } else if (detail.name) {
                    detailText = detail.name;
                  } else if (detail.value !== undefined) {
                    detailText = safeString(detail.value);
                  } else {
                    // Fallback: show the key
                    detailText = key;
                  }

                  // Add comment if exists
                  if (detail.comment) {
                    detailText += ` (${detail.comment})`;
                  }
                } else {
                  // Simple value
                  detailText = `${key}: ${safeString(detail)}`;
                }

                const detailLines = doc.splitTextToSize(detailText, maxWidth - 10);
                doc.text(detailLines, margin + 5, yPos);
                yPos += detailLines.length * 3.5 + 2;
              });
            }

            if (item.exam) {
              doc.setFontSize(9);
              const examText = safeString(item.exam);
              const examLines = doc.splitTextToSize(examText, maxWidth - 10);
              doc.text(examLines, margin + 5, yPos);
              yPos += examLines.length * 4;
            }

            yPos += 5;
          });
          yPos += sectionSpacing;
        }

        // Diagnostic Section
        if (patientHistoryData.value?.diagnostic?.length > 0) {
          addSectionHeader('DIAGNÓSTICO');
          patientHistoryData.value.diagnostic.forEach(item => {
            checkPageBreak(15);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const diagnosticText = safeString(item.diagnostic);
            const diagnosticLines = doc.splitTextToSize(diagnosticText, maxWidth);
            doc.text(diagnosticLines, margin + 5, yPos);
            yPos += diagnosticLines.length * 4 + 5;
          });
          yPos += sectionSpacing;
        }

        // Medical Order Section (generic text orders)
        if (patientHistoryData.value?.medicalOrder?.length > 0) {
          addSectionHeader('ORDEM MÉDICA (TEXTO LIVRE)');
          patientHistoryData.value.medicalOrder.forEach(item => {
            checkPageBreak(15);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = item.createdAt ? getDate(item.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const orderText = safeString(item.medicalOrder);
            const orderLines = doc.splitTextToSize(orderText, maxWidth);
            doc.text(orderLines, margin + 5, yPos);
            yPos += orderLines.length * 4 + 5;
          });
          yPos += sectionSpacing;
        }

        // Prescriptions Section
        if (prescriptions.value && prescriptions.value.length > 0) {
          addSectionHeader('RECETAS MÉDICAS');
          prescriptions.value.forEach(prescription => {
            checkPageBreak(20);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = prescription.createdAt ? getDate(prescription.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            if (prescription.medications && prescription.medications.length > 0) {
              prescription.medications.forEach((med, index) => {
                const medText = `${index + 1}. ${med.medication?.name || 'N/I'} - ${
                  med.dosage || 'N/I'
                } ${med.frequency || 'N/I'} - ${med.duration || 'N/I'} días`;
                const medLines = doc.splitTextToSize(medText, maxWidth - 10);
                doc.text(medLines, margin + 5, yPos);
                yPos += medLines.length * 4 + 2;
              });
            }

            if (prescription.generalInstructions) {
              const instructionsText = `Instrucciones: ${safeString(
                prescription.generalInstructions
              )}`;
              const instructionsLines = doc.splitTextToSize(instructionsText, maxWidth - 10);
              doc.text(instructionsLines, margin + 5, yPos);
              yPos += instructionsLines.length * 4 + 2;
            }

            yPos += 5;
          });
          yPos += sectionSpacing;
        }

        // Medical Exam Orders Section
        if (examOrders.value && examOrders.value.length > 0) {
          addSectionHeader('ÓRDENES DE EXÁMENES MÉDICOS');
          examOrders.value.forEach(order => {
            checkPageBreak(20);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = order.createdAt ? getDate(order.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            const typeText = `Tipo: ${order.examType || 'N/I'} - Prioridad: ${
              order.priority || 'N/I'
            }`;
            doc.text(typeText, margin + 5, yPos);
            yPos += 5;

            if (order.exams && order.exams.length > 0) {
              order.exams.forEach((exam, index) => {
                const examText = `${index + 1}. ${exam.name || exam.examName || 'N/I'}`;
                const examLines = doc.splitTextToSize(examText, maxWidth - 10);
                doc.text(examLines, margin + 5, yPos);
                yPos += examLines.length * 4 + 2;
              });
            }

            if (order.clinicalJustification) {
              const justificationText = `Justificación: ${safeString(order.clinicalJustification)}`;
              const justificationLines = doc.splitTextToSize(justificationText, maxWidth - 10);
              doc.text(justificationLines, margin + 5, yPos);
              yPos += justificationLines.length * 4 + 2;
            }

            yPos += 5;
          });
          yPos += sectionSpacing;
        }

        // Medical References Section
        if (references.value && references.value.length > 0) {
          addSectionHeader('REFERENCIAS MÉDICAS');
          references.value.forEach(reference => {
            checkPageBreak(20);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(100, 100, 100);
            const date = reference.createdAt ? getDate(reference.createdAt) : '';
            doc.text(date, margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            let destinationText = `Especialidad: ${reference.specialtyDestination || 'N/I'}`;
            if (reference.doctorDestinationName) {
              destinationText += ` - Dr(a). ${reference.doctorDestinationName}`;
            }
            doc.text(destinationText, margin + 5, yPos);
            yPos += 5;

            if (reference.reason) {
              const reasonText = `Motivo: ${safeString(reference.reason)}`;
              const reasonLines = doc.splitTextToSize(reasonText, maxWidth - 10);
              doc.text(reasonLines, margin + 5, yPos);
              yPos += reasonLines.length * 4 + 2;
            }

            if (reference.presumptiveDiagnosis) {
              const diagnosisText = `Diagnóstico Presuntivo: ${safeString(
                reference.presumptiveDiagnosis
              )}`;
              const diagnosisLines = doc.splitTextToSize(diagnosisText, maxWidth - 10);
              doc.text(diagnosisLines, margin + 5, yPos);
              yPos += diagnosisLines.length * 4 + 2;
            }

            yPos += 5;
          });
          yPos += sectionSpacing;
        }

        // Save PDF
        doc.save(filename);
        loading.value = false;
      } catch (error) {
        console.error('PDF export error:', error);
        loading.value = false;
      }
    };

    return {
      patientHistoryData,
      loading,
      commerce,
      toggles,
      getDateAndHour,
      getDate,
      exportToPDF,
      prescriptions,
      examOrders,
      references,
    };
  },
};
</script>
<template>
  <div class="patient-resume-modern">
    <div id="form" class="resume-form-container">
      <Spinner :show="loading"></Spinner>
      <div v-if="patientHistoryData && patientHistoryData.id">
        <div class="resume-header-modern">
          <div class="resume-header-content">
            <div class="resume-header-main">
              <div class="resume-commerce-badge">
                <i class="bi bi-building me-2"></i>
                <span>{{ commerce.name }}</span>
              </div>
              <div class="resume-patient-info">
                <h2 class="resume-patient-name">
                  <i class="bi bi-person-circle me-2"></i>
                  <span>{{ $t('dashboard.patientHistoryOf') }}</span>
                  <span class="patient-name-highlight">
                    {{ patientHistoryData.personalData?.name }}
                    {{ patientHistoryData.personalData?.lastName }}
                  </span>
                </h2>
                <div
                  v-if="patientHistoryData.modifiedAt || patientHistoryData.updatedDate"
                  class="resume-updated-info"
                >
                  <i class="bi bi-clock-history me-1"></i>
                  <span>{{ $t('patientHistoryView.updated') }}</span>
                  <span class="updated-date">
                    {{
                      getDateAndHour(
                        patientHistoryData.modifiedAt || patientHistoryData.updatedDate
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>
            <div class="resume-actions">
              <SimpleDownloadButton
                :download="toggles['patient.history.download']"
                :show-tooltip="false"
                @download="exportToPDF"
                :can-download="toggles['patient.history.download'] === true"
              ></SimpleDownloadButton>
            </div>
          </div>
        </div>
        <!-- PDF Header (only visible in PDF) -->
        <div class="pdf-header-info" style="display: none">
          <div class="pdf-header-clinic">
            <h1 class="pdf-clinic-name">{{ commerce.name }}</h1>
            <div
              class="pdf-clinic-details"
              v-if="commerce.address || commerce.phone || commerce.email"
            >
              <span v-if="commerce.address">{{ commerce.address }}</span>
              <span v-if="commerce.phone">{{ commerce.phone }}</span>
              <span v-if="commerce.email">{{ commerce.email }}</span>
            </div>
          </div>
          <div class="pdf-header-patient">
            <h2 class="pdf-patient-title">Prontuário Médico</h2>
            <div class="pdf-patient-name">
              {{ patientHistoryData.personalData?.name }}
              {{ patientHistoryData.personalData?.lastName }}
            </div>
            <div class="pdf-patient-details">
              <span v-if="patientHistoryData.personalData?.idNumber">
                CPF/Passaporte: {{ patientHistoryData.personalData.idNumber }}
              </span>
              <span v-if="patientHistoryData.personalData?.birthday">
                Nascimento: {{ getDate(patientHistoryData.personalData.birthday) }}
              </span>
              <span v-if="patientHistoryData.personalData?.age">
                Idade: {{ patientHistoryData.personalData.age }} anos
              </span>
            </div>
          </div>
          <div class="pdf-header-meta">
            <div class="pdf-generation-date">
              Documento gerado em: {{ getDateAndHour(new Date()) }}
            </div>
            <div
              class="pdf-last-update"
              v-if="patientHistoryData.modifiedAt || patientHistoryData.updatedDate"
            >
              Última atualização:
              {{ getDateAndHour(patientHistoryData.modifiedAt || patientHistoryData.updatedDate) }}
            </div>
          </div>
        </div>

        <div id="patient-history-resume" class="resume-content-modern">
          <div id="personal-data" class="resume-section-modern">
            <div class="resume-section-header">
              <div class="section-header-icon">
                <i class="bi bi-person-fill"></i>
              </div>
              <h3 class="section-header-title">{{ $t('patientHistoryView.showPersonalData') }}</h3>
            </div>
            <div class="resume-section-content">
              <div class="resume-data-grid">
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-person me-1"></i>
                    {{ $t('patientHistoryView.name') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.name || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-person-badge me-1"></i>
                    {{ $t('patientHistoryView.lastName') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.lastName || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-card-text me-1"></i>
                    {{ $t('patientHistoryView.idNumber') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.idNumber || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-calendar-event me-1"></i>
                    {{ $t('patientHistoryView.birthday') }}
                  </div>
                  <div class="data-item-value">
                    {{ getDate(patientHistoryData.personalData?.birthday) || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-calendar3 me-1"></i>
                    {{ $t('patientHistoryView.age') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.age || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-heart me-1"></i>
                    {{ $t('patientHistoryView.civilStatus') }}
                  </div>
                  <div class="data-item-value">
                    {{
                      $t(`civilStatuses.${patientHistoryData.personalData?.civilStatus}`) || 'N/I'
                    }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-gender-ambiguous me-1"></i>
                    {{ $t('patientHistoryView.sex') }}
                  </div>
                  <div class="data-item-value">
                    {{ $t(`sexs.${patientHistoryData.personalData?.sex}`) || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-briefcase me-1"></i>
                    {{ $t('patientHistoryView.occupation') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.occupation || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item resume-data-item-full">
                  <div class="data-item-label">
                    <i class="bi bi-geo-alt me-1"></i>
                    {{ $t('patientHistoryView.addressText') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.addressText || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-mailbox me-1"></i>
                    {{ $t('patientHistoryView.addressCode') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.addressCode || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-house-door me-1"></i>
                    {{ $t('patientHistoryView.addressComplement') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.addressComplement || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-telephone me-1"></i>
                    {{ $t('patientHistoryView.phone') }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.phone || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-envelope me-1"></i>
                    {{ $t('patientHistoryView.email') || 'Email' }}
                  </div>
                  <div class="data-item-value">
                    {{ patientHistoryData.personalData?.email || 'N/I' }}
                  </div>
                </div>
                <div class="resume-data-item">
                  <div class="data-item-label">
                    <i class="bi bi-info-circle me-1"></i>
                    {{ $t('patientHistoryView.font') }}
                  </div>
                  <div class="data-item-value">
                    {{ $t(`booleans.${patientHistoryData.personalData?.font}`) || 'N/I' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="consultationReason-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData.consultationReason &&
                patientHistoryData.consultationReason.length > 0 &&
                patientHistoryData.consultationReason[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-chat-dots"></i>
                </div>
                <h3 class="section-header-title">
                  {{ $t('patientHistoryView.consultationReason') }}
                </h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  v-for="(element, index) in patientHistoryData.consultationReason"
                  :key="`reason-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.reason"
                />
              </div>
            </div>
          </div>
          <div id="currentIllness-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData.currentIllness &&
                patientHistoryData.currentIllness.length > 0 &&
                patientHistoryData.currentIllness[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-activity"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.currentIllness') }}</h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  v-for="(element, index) in patientHistoryData.currentIllness"
                  :key="`illness-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.illness"
                />
              </div>
            </div>
          </div>
          <div id="patientAnamnese-data" class="resume-section-modern">
            <div v-if="patientHistoryData?.patientAnamnese">
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-clipboard-heart"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.patientAnamnese') }}</h3>
              </div>
              <div
                v-if="
                  toggles['patient.history.view'] &&
                  patientHistoryData.patientAnamnese &&
                  patientHistoryData.patientAnamnese.habitsDetails
                "
                class="anamnese-details-modern"
              >
                <div
                  v-for="item in Object.keys(patientHistoryData.patientAnamnese.habitsDetails)"
                  :key="item"
                  class="anamnese-item-modern"
                >
                  <div class="anamnese-item-title">
                    <i class="bi bi-tag-fill me-2"></i>
                    {{ patientHistoryData.patientAnamnese?.habitsDetails[item]?.title }}
                  </div>
                  <!-- YES NO-->
                  <div
                    v-if="
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics
                        ?.yesNo
                    "
                    class="anamnese-item-content"
                  >
                    <div class="anamnese-yesno-badge">
                      <i
                        :class="`bi ${
                          patientHistoryData.patientAnamnese.habitsDetails[item].answer?.answer
                            ? 'bi-check-circle-fill text-success'
                            : 'bi-x-circle-fill text-danger'
                        } me-2`"
                      ></i>
                      <span>{{
                        patientHistoryData.patientAnamnese.habitsDetails[item].answer?.answer
                          ? 'Sim'
                          : 'Não'
                      }}</span>
                    </div>
                    <HistoryDetailsCard
                      v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.result"
                      :show="toggles['patient.history.view']"
                      :content="
                        patientHistoryData.patientAnamnese?.habitsDetails[
                          item
                        ]?.answer?.result.join(', ')
                      "
                    />
                  </div>
                  <!-- SELECT N-->
                  <div
                    v-else-if="
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics
                        ?.selectN
                    "
                  >
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="
                        patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.join(', ')
                      "
                    >
                    </HistoryDetailsCard>
                  </div>
                  <!-- SELECT 1-->
                  <div
                    v-else-if="
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics
                        ?.select1
                    "
                  >
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="
                        patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer.join(', ')
                      "
                    >
                    </HistoryDetailsCard>
                  </div>
                  <!-- CHECK -->
                  <div
                    v-else-if="
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics
                        ?.check
                    "
                    class="anamnese-item-content"
                  >
                    <div class="anamnese-check-details">
                      <div
                        v-if="
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer
                            ?.actual !== undefined
                        "
                        class="anamnese-detail-item"
                      >
                        <span class="detail-label">
                          <i class="bi bi-info-circle me-1"></i>
                          {{ $t('businessPatientHistoryItemAdmin.actual') }}
                        </span>
                        <span class="detail-value">
                          <i
                            :class="`bi ${
                              patientHistoryData.patientAnamnese.habitsDetails[item].answer.actual
                                ? 'bi-check-circle-fill text-success'
                                : 'bi-x-circle-fill text-danger'
                            }`"
                          ></i>
                        </span>
                      </div>
                      <div
                        v-if="
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.ageFrom
                        "
                        class="anamnese-detail-item"
                      >
                        <span class="detail-label">
                          <i class="bi bi-calendar-event me-1"></i>
                          {{ $t('businessPatientHistoryItemAdmin.ageFrom') }}
                        </span>
                        <span class="detail-value">
                          {{
                            patientHistoryData.patientAnamnese.habitsDetails[item].answer.ageFrom
                          }}
                        </span>
                      </div>
                      <div
                        v-if="
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.ageTo
                        "
                        class="anamnese-detail-item"
                      >
                        <span class="detail-label">
                          <i class="bi bi-calendar3 me-1"></i>
                          {{ $t('businessPatientHistoryItemAdmin.ageTo') }}
                        </span>
                        <span class="detail-value">
                          {{ patientHistoryData.patientAnamnese.habitsDetails[item].answer.ageTo }}
                        </span>
                      </div>
                      <div
                        v-if="
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                          patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.frequency
                        "
                        class="anamnese-detail-item"
                      >
                        <span class="detail-label">
                          <i class="bi bi-arrow-repeat me-1"></i>
                          {{ $t('businessPatientHistoryItemAdmin.frequency') }}
                        </span>
                        <span class="detail-value">
                          {{
                            $t(
                              `patientHistoryItemFrequenciesTypes.${patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.frequency}`
                            )
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <!-- COMMENT -->
                  <div
                    v-if="
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics
                        ?.comment
                    "
                  >
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="patientHistoryData.patientAnamnese?.habitsDetails[item]?.comment"
                    >
                    </HistoryDetailsCard>
                  </div>
                </div>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="patientHistoryData.modifiedAt"
                  :content="patientHistoryData.patientAnamnese?.habits"
                />
              </div>
            </div>
          </div>
          <div id="functionalExam-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData?.functionalExam &&
                patientHistoryData.functionalExam.length > 0 &&
                patientHistoryData.functionalExam[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-heart-pulse"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.functionalExam') }}</h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  v-for="(element, index) in patientHistoryData.functionalExam"
                  :key="`functional-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.exam"
                />
              </div>
            </div>
          </div>
          <div id="physicalExam-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData.physicalExam &&
                patientHistoryData.physicalExam.length > 0 &&
                patientHistoryData.physicalExam[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-thermometer-half"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.physicalExam') }}</h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsWithItemsCard
                  v-for="(element, index) in patientHistoryData.physicalExam"
                  :key="`physical-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :details="element.examDetails"
                  :content="element.exam"
                />
              </div>
            </div>
          </div>
          <div id="diagnostic-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData.diagnostic &&
                patientHistoryData.diagnostic.length > 0 &&
                patientHistoryData.diagnostic[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-clipboard-check"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.diagnostic') }}</h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  v-for="(element, index) in patientHistoryData.diagnostic"
                  :key="`diagnostic-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.diagnostic"
                />
              </div>
            </div>
          </div>
          <div id="medicalOrder-data" class="resume-section-modern">
            <div
              v-if="
                patientHistoryData.medicalOrder &&
                patientHistoryData.medicalOrder.length > 0 &&
                patientHistoryData.medicalOrder[0]
              "
            >
              <div class="resume-section-header">
                <div class="section-header-icon">
                  <i class="bi bi-prescription"></i>
                </div>
                <h3 class="section-header-title">{{ $t('patientHistoryView.medicalOrder') }}</h3>
              </div>
              <div class="resume-history-list">
                <HistoryDetailsCard
                  v-for="(element, index) in patientHistoryData.medicalOrder"
                  :key="`medical-order-${index}`"
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.medicalOrder"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <Message
          :title="$t('patientHistoryView.message.1.title')"
          :content="$t('patientHistoryView.message.1.content')"
        />
      </div>
    </div>
  </div>
</template>
<style scoped>
.patient-resume-modern {
  width: 100%;
  padding: 0.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

.resume-form-container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

.resume-header-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.resume-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.resume-header-main {
  flex: 1;
  min-width: 300px;
}

.resume-commerce-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.resume-patient-info {
  margin-top: 0.5rem;
}

.resume-patient-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.3rem 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  line-height: 1.3;
}

.patient-name-highlight {
  color: var(--azul-turno);
  font-weight: 800;
}

.resume-updated-info {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  gap: 0.25rem;
  opacity: 0.85;
}

.updated-date {
  font-weight: 600;
  color: var(--azul-turno);
}

.resume-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.resume-content-modern {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resume-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resume-item-card {
  background: rgba(255, 255, 255, 0.6);
  padding: 0.75rem;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}

.resume-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.resume-item-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.resume-item-status,
.resume-item-priority,
.resume-item-urgency {
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
}

.status-active {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.status-requested {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.status-completed {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.status-pending {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.status-accepted {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.priority-urgent {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.priority-high {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.priority-normal {
  background: rgba(68, 111, 252, 0.1);
  color: var(--azul-turno);
}

.urgency-urgent {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.urgency-preferred {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.urgency-routine {
  background: rgba(68, 111, 252, 0.1);
  color: var(--azul-turno);
}

.resume-item-content {
  font-size: 0.875rem;
  color: var(--color-text);
}

.resume-item-text {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.resume-item-list {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.resume-item-list li {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.resume-section-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.875rem 1rem;
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.resume-section-modern:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.resume-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.625rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
}

.section-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.375rem;
  margin-right: 0.625rem;
  font-size: 0.9rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.section-header-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.01em;
}

.resume-section-content {
  padding: 0.4rem 0;
}

.resume-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}

.resume-data-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.625rem;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 0.375rem;
  border-left: 2px solid var(--azul-turno);
  transition: all 0.15s ease;
}

.resume-data-item:hover {
  background: rgba(0, 0, 0, 0.03);
  transform: translateX(2px);
}

.resume-data-item-full {
  grid-column: 1 / -1;
}

.data-item-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  opacity: 0.8;
}

.data-item-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  word-break: break-word;
  line-height: 1.4;
}

.resume-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* PDF Export Styles */
.pdf-header-info {
  display: none;
  padding: 0.4in 0.5in 0.3in 0.5in;
  border-bottom: 2px solid #000;
  margin-bottom: 0.4in;
  background: white;
  page-break-after: avoid;
}

.pdf-header-clinic {
  text-align: center;
  margin-bottom: 0.6rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ddd;
}

.pdf-clinic-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #000;
  margin: 0 0 0.4rem 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.pdf-clinic-details {
  font-size: 0.7rem;
  color: #555;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  line-height: 1.4;
}

.pdf-header-patient {
  text-align: center;
  margin-bottom: 0.6rem;
  padding: 0.6rem;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}

.pdf-patient-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.4rem 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pdf-patient-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.4rem;
  line-height: 1.3;
}

.pdf-patient-details {
  font-size: 0.75rem;
  color: #555;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  line-height: 1.4;
}

.pdf-header-meta {
  font-size: 0.65rem;
  color: #666;
  text-align: center;
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-top: 1px solid #ddd;
  line-height: 1.4;
}

.pdf-generation-date,
.pdf-last-update {
  flex: 1;
  text-align: left;
}

.pdf-last-update {
  text-align: right;
}

.pdf-export-mode {
  background: white !important;
  padding: 0.5in !important;
}

.pdf-export-mode .pdf-header-info {
  display: block !important;
}

.pdf-export-mode .resume-header-modern {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 2px solid #000;
  background: white !important;
}

.pdf-export-mode .resume-section-modern {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #ddd;
  background: white !important;
  box-shadow: none !important;
}

.pdf-export-mode .resume-actions {
  display: none !important;
}

.pdf-export-mode .resume-data-item {
  background: rgba(0, 0, 0, 0.02) !important;
  border: 1px solid #eee;
}

.pdf-export-mode .resume-history-list {
  page-break-inside: avoid;
}

@media print {
  .patient-resume-modern {
    padding: 0.5in;
    background: white;
  }

  .resume-header-modern,
  .resume-section-modern {
    page-break-inside: avoid;
    break-inside: avoid;
    background: white !important;
    box-shadow: none !important;
  }

  .resume-actions {
    display: none;
  }

  .resume-section-modern {
    border: 1px solid #ddd;
    margin-bottom: 0.75rem;
  }
}

/* Anamnese Details */
.anamnese-details-modern {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.75rem;
}

.anamnese-item-modern {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 0.5rem;
  border-left: 2px solid var(--azul-turno);
  transition: all 0.15s ease;
}

.anamnese-item-modern:hover {
  background: rgba(0, 0, 0, 0.03);
  transform: translateX(2px);
}

.anamnese-item-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.anamnese-item-content {
  padding: 0.5rem 0;
}

.anamnese-yesno-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.anamnese-check-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.anamnese-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 0.3rem;
}

.detail-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  opacity: 0.85;
}

.detail-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

/* Responsive */
@media (max-width: 768px) {
  .resume-header-content {
    flex-direction: column;
  }

  .resume-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .resume-data-grid {
    grid-template-columns: 1fr;
  }

  .resume-patient-name {
    font-size: 1.25rem;
  }

  .anamnese-detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
