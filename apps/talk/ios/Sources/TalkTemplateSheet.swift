import SwiftUI
import TikoKit

struct TalkTemplateSheet: View {
    let templates: [TalkTemplate]
    let appColor: TikoAppColor
    let onSelect: (TalkTemplate) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(templates) { template in
                    Button {
                        onSelect(template)
                        dismiss()
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: template.icon ?? "text.bubble.fill")
                                .foregroundStyle(appColor.palette.primary)
                                .frame(width: 28)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(template.pattern)
                                    .font(.system(.headline, design: .rounded).weight(.bold))
                                Text(template.category)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Templates")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
