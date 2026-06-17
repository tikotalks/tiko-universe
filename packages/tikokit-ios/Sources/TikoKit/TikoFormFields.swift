import SwiftUI

// MARK: - Form field container

public struct TikoFormField<Content: View>: View {
    let label: String
    let content: Content

    public init(label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            TikoFieldLabel(label)
            content
                .padding(14)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                }
        }
    }
}

public struct TikoFieldLabel: View {
    let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            .foregroundStyle(.secondary)
    }
}

// MARK: - Primary action button

public struct TikoActionButton: View {
    let label: String
    let appColor: TikoAppColor
    let disabled: Bool
    let action: () -> Void

    public init(label: String, appColor: TikoAppColor, disabled: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.appColor = appColor
        self.disabled = disabled
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 17, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(disabled ? Color(.systemFill) : appColor.palette.primary)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}

// MARK: - Compact color picker row

public struct TikoCompactColorPicker: View {
    @Binding public var selectedColor: String
    public let label: String
    public let appColor: TikoAppColor
    @State private var showingGrid = false

    public init(selectedColor: Binding<String>, label: String, appColor: TikoAppColor) {
        self._selectedColor = selectedColor
        self.label = label
        self.appColor = appColor
    }

    public var body: some View {
        Button { showingGrid = true } label: {
            HStack(spacing: 10) {
                TikoFieldLabel(label)
                Spacer()
                Circle()
                    .fill(TikoColors.color(named: selectedColor) ?? TikoColors.color(named: "gray")!)
                    .frame(width: 28, height: 28)
                    .shadow(color: .black.opacity(0.18), radius: 3, x: 0, y: 1)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .tikoPopup(isPresented: $showingGrid) {
            TikoPopupCard(title: label, icon: "paintpalette", appColor: appColor, onClose: { showingGrid = false }) {
                TikoColorGridPicker(selectedColor: Binding(
                    get: { selectedColor },
                    set: { selectedColor = $0; showingGrid = false }
                ))
            }
        }
    }
}

public struct TikoColorGridPicker: View {
    @Binding public var selectedColor: String

    public init(selectedColor: Binding<String>) {
        self._selectedColor = selectedColor
    }

    public var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5),
            spacing: 10
        ) {
            ForEach(TikoColors.all, id: \.name) { color in
                ZStack {
                    Circle()
                        .fill(Color(hex: color.hex))
                    if selectedColor == color.name {
                        Circle().strokeBorder(Color.white, lineWidth: 2.5)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                    }
                }
                .frame(height: 38)
                .onTapGesture {
                    withAnimation(.spring(response: 0.2)) { selectedColor = color.name }
                }
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        }
    }
}

// MARK: - Image picker button

public struct TikoImagePickerButton: View {
    public let selectedURL: URL?
    public let appColor: TikoAppColor
    public let addLabel: String
    public let changeLabel: String
    public let tapToChangeLabel: String
    public let action: () -> Void

    public init(
        selectedURL: URL?,
        appColor: TikoAppColor,
        addLabel: String,
        changeLabel: String,
        tapToChangeLabel: String = "",
        action: @escaping () -> Void
    ) {
        self.selectedURL = selectedURL
        self.appColor = appColor
        self.addLabel = addLabel
        self.changeLabel = changeLabel
        self.tapToChangeLabel = tapToChangeLabel
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                imagePreview
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedURL != nil ? changeLabel : addLabel)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.primary)
                    if selectedURL != nil && !tapToChangeLabel.isEmpty {
                        Text(tapToChangeLabel)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var imagePreview: some View {
        if let url = selectedURL {
            if url.isFileURL {
                if let img = UIImage(contentsOfFile: url.path) {
                    Image(uiImage: img).resizable().scaledToFill()
                } else {
                    placeholder
                }
            } else {
                TikoCachedRemoteImage(url: thumbnailURL(url)) {
                    placeholder
                }
            }
        } else {
            placeholder
        }
    }

    private var placeholder: some View {
        Image(systemName: "photo.fill")
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(appColor.palette.primary)
            .frame(width: 44, height: 44)
            .background(appColor.palette.primary.opacity(0.12))
    }

    private func thumbnailURL(_ url: URL) -> URL {
        TikoImageURL.resized(url, width: 150, quality: 80)
    }
}
