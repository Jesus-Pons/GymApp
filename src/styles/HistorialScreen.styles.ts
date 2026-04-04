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
  headerTitleContainer: { flex: 1, marginLeft: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.subText, marginTop: 2 },
  
  backButton: { marginRight: 5, padding: 5 },
  backButtonText: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  
  deleteAllButton: { padding: 5 },
  deleteAllText: { color: COLORS.danger, fontWeight: '600', fontSize: 16 },
  deleteDetailButton: { padding: 5, marginLeft: 10 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  deleteIconButton: { marginLeft: 10, padding: 4 },
  deleteIconText: { fontSize: 18,color: COLORS.danger, fontWeight: '500' },

  routineCard: { 
    backgroundColor: COLORS.cardBg, padding: 20, marginHorizontal: 16, 
    marginTop: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 10 },
  durationTag: { fontSize: 14, color: COLORS.primary, fontWeight: '700', backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSubtitle: { fontSize: 14, color: COLORS.subText, fontWeight: '500' },
  exerciseCount: { fontSize: 13, color: COLORS.subText, fontWeight: '600', backgroundColor: COLORS.tagBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  exerciseItem: { 
    backgroundColor: COLORS.cardBg, paddingHorizontal: 20, paddingVertical: 18, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  exerciseHeader: { marginBottom: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  tagContainer: { flexDirection: 'row' },
  dataTag: { backgroundColor: COLORS.tagBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  tagText: { color: COLORS.subText, fontSize: 13, fontWeight: '600' },

  seriesList: { marginTop: 12, gap: 8 },
  seriesRow: { flexDirection: 'row', alignItems: 'center' },
  seriesStatus: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: COLORS.cardBg },
  seriesStatusCompleted: { backgroundColor: '#10B981', borderColor: '#10B981' },
  seriesStatusText: { color: COLORS.cardBg, fontWeight: '800', fontSize: 12, marginTop: -1 },
  seriesText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },

  emptyText: { textAlign: 'center', marginTop: 60, color: COLORS.subText, fontSize: 16, paddingHorizontal: 40 },
});