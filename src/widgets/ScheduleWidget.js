import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";

const calendarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="none" stroke="#4F46E5" stroke-linejoin="round" stroke-width="32" x="48" y="80" width="416" height="384" rx="48"/><circle cx="296" cy="232" r="24" fill="#4F46E5"/><circle cx="376" cy="232" r="24" fill="#4F46E5"/><circle cx="296" cy="312" r="24" fill="#4F46E5"/><circle cx="376" cy="312" r="24" fill="#4F46E5"/><circle cx="136" cy="312" r="24" fill="#4F46E5"/><circle cx="216" cy="312" r="24" fill="#4F46E5"/><circle cx="136" cy="392" r="24" fill="#4F46E5"/><circle cx="216" cy="392" r="24" fill="#4F46E5"/><circle cx="296" cy="392" r="24" fill="#4F46E5"/><line fill="none" stroke="#4F46E5" stroke-linejoin="round" stroke-width="32" stroke-linecap="round" x1="128" y1="48" x2="128" y2="80"/><line fill="none" stroke="#4F46E5" stroke-linejoin="round" stroke-width="32" stroke-linecap="round" x1="384" y1="48" x2="384" y2="80"/><line fill="none" stroke="#4F46E5" stroke-linejoin="round" stroke-width="32" x1="48" y1="160" x2="464" y2="160"/></svg>`;

const roomSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M336 16L176 16C167.2 16 160 23.2 160 32L160 480C160 488.8 167.2 496 176 496L336 496C344.8 496 352 488.8 352 480L352 32C352 23.2 344.8 16 336 16zM224 432L192 432L192 384L224 384L224 432zM224 336L192 336L192 288L224 288L224 336zM224 240L192 240L192 192L224 192L224 240zM224 144L192 144L192 96L224 96L224 144zM320 432L288 432L288 384L320 384L320 432zM320 336L288 336L288 288L320 288L320 336zM320 240L288 240L288 192L320 192L320 240zM320 144L288 144L288 96L320 96L320 144zM496 192L384 192C375.2 192 368 199.2 368 208L368 480C368 488.8 375.2 496 384 496L496 496C504.8 496 512 488.8 512 480L512 208C512 199.2 504.8 192 496 192zM464 432L416 432L416 384L464 384L464 432zM464 336L416 336L416 288L464 288L464 336zM144 192L32 192C23.2 192 16 199.2 16 208L16 480C16 488.8 23.2 496 32 496L144 496C152.8 496 160 488.8 160 480L160 208C160 199.2 152.8 192 144 192zM112 432L64 432L64 384L112 384L112 432zM112 336L64 336L64 288L112 288L112 336z" fill="#818CF8"/></svg>`;

const personSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 256c52.8 0 96-43.2 96-96s-43.2-96-96-96-96 43.2-96 96 43.2 96 96 96zm0 48c-63.6 0-192 31.8-192 96v48h384v-48c0-64.2-128.4-96-192-96z" fill="#94A3B8"/></svg>`;

export function ScheduleWidget({ schedules = [] }) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = days[new Date().getDay()];

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#0F172A", // Screen bg `#0F172A`
        borderRadius: 24,
        padding: 20, // Increased padding so content shifts to center/right and not stick to edges
        flexDirection: "column",
      }}
    >
      {/* Header matching SchedulesScreen */}
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <FlexWidget
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#312e81", // indigo-900
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            borderWidth: 1,
            borderColor: "#3730A3", // indigo-800
          }}
        >
          <SvgWidget svg={calendarSvg} style={{ width: 22, height: 22 }} />
        </FlexWidget>
        <TextWidget
          text={todayName}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#FFFFFF",
            flex: 1, // Space evenly
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: "#1E293B", // slate-800
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            marginLeft: 12, // Gap from the title text
            borderWidth: 1,
            borderColor: "#334155", // slate-700
          }}
        >
          <TextWidget
            text={`${schedules.length} SESI`}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#CBD5E1", // slate-300
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Main Cards List */}
      <FlexWidget style={{ flex: 1, flexDirection: "column" }}>
        {schedules.length === 0 ? (
          <FlexWidget
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <TextWidget
              text="Wah.. Bebas jadwal hari ini 🎉"
              style={{ fontSize: 14, color: "#64748B" }}
            />
          </FlexWidget>
        ) : (
          schedules
            .slice(0, Math.min(6, schedules.length))
            .map((item, index) => {
              return (
                <FlexWidget
                  key={item.id || index}
                  style={{
                    width: "match_parent",
                    flexDirection: "row",
                    backgroundColor: "#1E293B", // slate-800
                    borderRadius: 24, // rounded-[28px]
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#334155", // slate-700
                  }}
                >
                  {/* Left Time Column */}
                  <FlexWidget
                    style={{
                      width: 60,
                      marginRight: 12,
                      paddingRight: 12,
                      borderRightWidth: 1,
                      borderColor: "#334155", // slate-700
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TextWidget
                      text={item.start_time || "-"}
                      maxLines={1}
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#FFFFFF",
                      }}
                    />
                    <TextWidget
                      text="SAMPAI"
                      style={{
                        fontSize: 9,
                        fontWeight: "bold",
                        color: "#34D399", // emerald-400
                        marginVertical: 4,
                      }}
                    />
                    <TextWidget
                      text={item.end_time || "-"}
                      maxLines={1}
                      style={{ fontSize: 14, color: "#94A3B8" }} // slate-400
                    />
                  </FlexWidget>

                  {/* Right Details Column */}
                  <FlexWidget
                    style={{
                      flex: 1,
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <TextWidget
                      text={item.course_name || "Mata Kuliah"}
                      maxLines={1}
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#F1F5F9",
                        marginBottom: 8,
                      }}
                    />

                    {/* Badges Row */}
                    <FlexWidget
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {/* Room Badge */}
                      <FlexWidget
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#312e81", // indigo-900/50
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          marginRight: 8, // Using margin instead of flex wrap spacing (since FlexWidget may not support gap)
                          marginBottom: 4,
                          alignItems: "center",
                        }}
                      >
                        <SvgWidget
                          svg={roomSvg}
                          style={{ width: 12, height: 12, marginRight: 4 }}
                        />
                        <TextWidget
                          text={`${item.room || "Ruang TBA"}`}
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color: "#818CF8",
                          }} // indigo-400
                        />
                      </FlexWidget>

                      {/* Lecturer Badge */}
                      <FlexWidget
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#334155", // slate-700/50
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          marginBottom: 4,
                          alignItems: "center",
                        }}
                      >
                        <SvgWidget
                          svg={personSvg}
                          style={{ width: 12, height: 12, marginRight: 4 }}
                        />
                        <TextWidget
                          text={`${item.lecturer_name || "Tanpa Dosen"}`}
                          maxLines={1}
                          style={{
                            fontSize: 11,
                            color: "#CBD5E1",
                          }} // removed maxWidth
                        />
                      </FlexWidget>
                    </FlexWidget>
                  </FlexWidget>
                </FlexWidget>
              );
            })
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
