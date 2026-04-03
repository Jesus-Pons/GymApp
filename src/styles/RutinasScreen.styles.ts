import { StyleSheet } from 'react-native';

const COLORS = {
  bg: '#F8F9FA',
  cardBg: '#FFFFFF',
  text: '#1A1A1A',
  subText: '#6C757D',
  primary: '#007AFF',
  danger: '#DC3545',
  tagBg: '#E9ECEF',
  border: '#DEE2E6',
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  backButton: { marginRight: 15, padding: 5 },
  backButtonText: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },

  headerRightActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 5 },
  deleteButtonTextMinimal: { color: COLORS.danger, fontWeight: '600', fontSize: 16 },

  addButtonMinimal: { paddingHorizontal: 12, paddingVertical: 6 },
  addButtonTextMinimal: { color: COLORS.primary, fontWeight: '600', fontSize: 16 },

  routineCard: {
    backgroundColor: COLORS.cardBg, padding: 24, marginHorizontal: 16,
    marginTop: 16, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: COLORS.subText },

  playButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  playButtonText: {
    color: COLORS.cardBg,
    fontWeight: '700',
    fontSize: 14,
  },

  exerciseItem: {
    backgroundColor: COLORS.cardBg, paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  exerciseHeader: { marginBottom: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  tagContainer: { flexDirection: 'row' },
  dataTag: { backgroundColor: COLORS.tagBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  tagText: { color: COLORS.subText, fontSize: 13, fontWeight: '600' },
  swipeDeleteAction: { backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  swipeDeleteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', marginTop: 60, color: COLORS.subText, fontSize: 16, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 24, elevation: 10, maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 30 },
  modalFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.text },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 15, color: COLORS.text,
  },
  seriesEditorList: { marginBottom: 4 },

  modalActionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15,
  },
  modalActionsRowEnd: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15,
  },

  modalActionsGroup: { flexDirection: 'row', alignItems: 'center' },
  deleteActionBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  deleteActionText: { color: COLORS.danger, fontWeight: '600', fontSize: 16 },

  cancelBtn: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 10 },
  cancelBtnText: { color: COLORS.subText, fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  saveBtnText: { color: COLORS.cardBg, fontWeight: '600', fontSize: 16 },
});
